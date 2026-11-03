import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "@/lib/format";

export type DigestTask = {
  title: string;
  due_on: string;
  days_until_due: number;
  category: string | null;
  icon: string | null;
  assignee?: string | null;
};

/**
 * Plain-text digest: overdue, due within `soonDays`, then any later tasks under "Upcoming".
 * Returns null when there is nothing to say.
 */
export function buildDigest(tasks: DigestTask[], appUrl: string, soonDays = 3) {
  const overdue = tasks.filter((t) => t.days_until_due < 0).sort((a, b) => a.days_until_due - b.days_until_due);
  const soon = tasks.filter((t) => t.days_until_due >= 0 && t.days_until_due <= soonDays).sort((a, b) => a.days_until_due - b.days_until_due);
  const upcoming = tasks.filter((t) => t.days_until_due > soonDays).sort((a, b) => a.days_until_due - b.days_until_due);
  if (overdue.length === 0 && soon.length === 0 && upcoming.length === 0) return null;

  const line = (t: DigestTask) => {
    const when = t.days_until_due === 0 ? "today" : t.days_until_due === 1 ? "tomorrow" : t.days_until_due < 0 ? `${-t.days_until_due}d overdue` : `in ${t.days_until_due}d`;
    return `${t.icon ?? "•"} ${t.title} — ${when} (${formatDate(t.due_on, { year: undefined })})${t.assignee ? ` → ${t.assignee}` : ""}`;
  };

  const parts: string[] = ["🏠 Home tasks"];
  if (overdue.length) parts.push("", `⚠️ Overdue (${overdue.length})`, ...overdue.map(line));
  if (soon.length) parts.push("", `📅 Due in ${soonDays} days (${soon.length})`, ...soon.map(line));
  if (upcoming.length) parts.push("", `🗓️ Upcoming (${upcoming.length})`, ...upcoming.map(line));
  parts.push("", appUrl);
  return parts.join("\n");
}

/**
 * Active tasks (not paused/archived/finished) for one household, shaped for `buildDigest`.
 * Limited to overdue + due within `maxDays`; pass `null` for every active task.
 */
export async function loadDigestTasks(client: SupabaseClient, householdId: string, maxDays: number | null = 3): Promise<DigestTask[]> {
  let query = client
    .from("task_due")
    .select("title, due_on, days_until_due, categories(name, icon), contacts(name)")
    .eq("household_id", householdId)
    .not("due_on", "is", null);
  if (maxDays !== null) query = query.lte("days_until_due", maxDays);
  const { data, error } = await query.order("due_on");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const cat = r.categories as unknown as { name: string; icon: string | null } | null;
    const contact = r.contacts as unknown as { name: string } | null;
    return { title: r.title, due_on: r.due_on!, days_until_due: r.days_until_due!, category: cat?.name ?? null, icon: cat?.icon ?? null, assignee: contact?.name ?? null };
  });
}

export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
}
