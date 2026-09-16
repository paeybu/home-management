import type { IntervalUnit, ScheduleType } from "@/lib/types";

export const APP_TZ = process.env.NEXT_PUBLIC_APP_TZ ?? "Asia/Bangkok";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "THB";

export function formatDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  const date = typeof d === "string" && d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", ...opts });
}

export function formatMoney(n: number | string | null | undefined) {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(Number(n));
}

export function relativeDue(days: number | null) {
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days overdue`;
  return `In ${days} days`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function describeSchedule(t: {
  schedule_type: ScheduleType;
  interval_value: number | null;
  interval_unit: IntervalUnit | null;
  fixed_day_of_month: number | null;
  fixed_month: number | null;
}) {
  if (t.schedule_type === "once") return "One-off";
  const n = t.interval_value ?? 1;
  const unit = t.interval_unit ?? "month";
  const every = n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
  if (t.schedule_type === "rolling") return `${every} after completion`;
  const dom = ordinal(t.fixed_day_of_month ?? 1);
  if (unit === "year") return `${every} on ${dom} ${MONTHS[(t.fixed_month ?? 1) - 1]}`;
  return `${every} on the ${dom}`;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Today's date (YYYY-MM-DD) in the app timezone. */
export function todayISO(tz = APP_TZ) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
