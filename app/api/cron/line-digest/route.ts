import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDigest, type DigestTask } from "@/lib/digest";
import { lineConfigured, linePushText } from "@/lib/line";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Daily LINE digest. Vercel Cron -> GET with `Authorization: Bearer ${CRON_SECRET}`.
 * Idempotent per (household, channel, day) via reminder_log. Pass ?force=1 to bypass the log (manual re-run).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!lineConfigured()) return NextResponse.json({ skipped: "LINE not configured" }, { status: 200 });

  const force = new URL(request.url).searchParams.get("force") === "1";
  const admin = createAdminClient();
  const today = todayISO();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

  const { data: households, error: hErr } = await admin.from("households").select("id, name");
  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  const results: Record<string, string> = {};
  for (const h of households ?? []) {
    if (!force) {
      const { data: logged } = await admin.from("reminder_log").select("id").eq("household_id", h.id).eq("channel", "line").eq("sent_on", today).maybeSingle();
      if (logged) { results[h.id] = "already_sent"; continue; }
    }

    const { data: rows, error } = await admin
      .from("task_due")
      .select("title, due_on, days_until_due, categories(name, icon), contacts(name)")
      .eq("household_id", h.id)
      .not("due_on", "is", null)
      .lte("days_until_due", 3)
      .order("due_on");
    if (error) { results[h.id] = `query_error: ${error.message}`; continue; }

    const tasks: DigestTask[] = (rows ?? []).map((r) => {
      const cat = r.categories as unknown as { name: string; icon: string | null } | null;
      const contact = r.contacts as unknown as { name: string } | null;
      return { title: r.title, due_on: r.due_on!, days_until_due: r.days_until_due!, category: cat?.name ?? null, icon: cat?.icon ?? null, assignee: contact?.name ?? null };
    });
    const text = buildDigest(tasks, appUrl);
    if (!text) { results[h.id] = "nothing_due"; continue; }

    try {
      await linePushText(text);
      await admin.from("reminder_log").upsert(
        { household_id: h.id, channel: "line", sent_on: today, task_count: tasks.length, payload: { text } },
        { onConflict: "household_id,channel,sent_on" },
      );
      results[h.id] = `sent:${tasks.length}`;
    } catch (e) {
      results[h.id] = `line_error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({ date: today, results });
}
