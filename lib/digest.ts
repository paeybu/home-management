import "server-only";
import { formatDate } from "@/lib/format";

export type DigestTask = {
  title: string;
  due_on: string;
  days_until_due: number;
  category: string | null;
  icon: string | null;
};

/** Plain-text digest of overdue + due within `soonDays` tasks. Returns null when there is nothing to say. */
export function buildDigest(tasks: DigestTask[], appUrl: string, soonDays = 3) {
  const overdue = tasks.filter((t) => t.days_until_due < 0).sort((a, b) => a.days_until_due - b.days_until_due);
  const soon = tasks.filter((t) => t.days_until_due >= 0 && t.days_until_due <= soonDays).sort((a, b) => a.days_until_due - b.days_until_due);
  if (overdue.length === 0 && soon.length === 0) return null;

  const line = (t: DigestTask) => {
    const when = t.days_until_due === 0 ? "today" : t.days_until_due === 1 ? "tomorrow" : t.days_until_due < 0 ? `${-t.days_until_due}d overdue` : `in ${t.days_until_due}d`;
    return `${t.icon ?? "•"} ${t.title} — ${when} (${formatDate(t.due_on, { year: undefined })})`;
  };

  const parts: string[] = ["🏠 Home tasks"];
  if (overdue.length) parts.push("", `⚠️ Overdue (${overdue.length})`, ...overdue.map(line));
  if (soon.length) parts.push("", `📅 Due in ${soonDays} days (${soon.length})`, ...soon.map(line));
  parts.push("", appUrl);
  return parts.join("\n");
}
