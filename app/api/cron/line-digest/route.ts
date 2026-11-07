import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { appBaseUrl, buildDigest, loadDigestTasks, loadFridgeItems, type DigestTask } from "@/lib/digest";
import { fridgeDigestSection } from "@/lib/fridge";
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
  const appUrl = appBaseUrl();

  const { data: households, error: hErr } = await admin.from("households").select("id, name");
  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  const results: Record<string, string> = {};
  for (const h of households ?? []) {
    if (!force) {
      const { data: logged } = await admin.from("reminder_log").select("id").eq("household_id", h.id).eq("channel", "line").eq("sent_on", today).maybeSingle();
      if (logged) { results[h.id] = "already_sent"; continue; }
    }

    let tasks: DigestTask[];
    let fridge: string[];
    try {
      const [t, items] = await Promise.all([loadDigestTasks(admin, h.id), loadFridgeItems(admin, h.id)]);
      tasks = t;
      fridge = fridgeDigestSection(items, today);
    } catch (e) {
      results[h.id] = `query_error: ${e instanceof Error ? e.message : String(e)}`;
      continue;
    }
    const text = buildDigest(tasks, appUrl, 3, [fridge]);
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
