import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PKCE code exchange, then allowlist gate:
 * - email in allowed_emails and no membership yet -> create membership (first member becomes owner)
 * - email not allowed -> sign out and bounce to /login?error=not_allowed
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = process.env.NODE_ENV === "development" || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (!code) return NextResponse.redirect(`${base}/login?error=callback`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${base}/login?error=callback`);

  const user = data.user;
  const email = user.email?.toLowerCase();
  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const { data: allowed } = email
      ? await admin.from("allowed_emails").select("household_id").eq("email", email).maybeSingle()
      : { data: null };

    if (!allowed) {
      await supabase.auth.signOut();
      await admin.auth.admin.deleteUser(user.id).catch(() => {});
      return NextResponse.redirect(`${base}/login?error=not_allowed`);
    }

    const { count } = await admin
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", allowed.household_id);

    await admin.from("household_members").insert({
      household_id: allowed.household_id,
      user_id: user.id,
      role: (count ?? 0) === 0 ? "owner" : "member",
    });
    await admin
      .from("households")
      .update({ created_by: user.id })
      .eq("id", allowed.household_id)
      .is("created_by", null);
  }

  return NextResponse.redirect(`${base}${next.startsWith("/") ? next : "/"}`);
}
