import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Session = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | null;
  householdId: string;
  role: "owner" | "member";
};

/**
 * Verifies the JWT, then resolves the caller's household membership.
 * Redirects to /login when unauthenticated, or to /login?error=not_allowed when no membership exists.
 */
export async function requireSession(): Promise<Session> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login");

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? null;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    redirect("/login?error=not_allowed");
  }

  return {
    supabase,
    userId,
    email,
    householdId: membership.household_id,
    role: membership.role as "owner" | "member",
  };
}
