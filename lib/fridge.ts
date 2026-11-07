import type { FridgeItem, FridgeLocation, FridgeUnit } from "@/lib/types";

export const FRIDGE_LOCATIONS: { value: FridgeLocation; label: string; icon: string }[] = [
  { value: "fridge", label: "Fridge", icon: "🧊" },
  { value: "freezer", label: "Freezer", icon: "❄️" },
];

export const FRIDGE_UNITS: { value: FridgeUnit; label: string }[] = [
  { value: "pcs", label: "pcs" },
  { value: "pack", label: "pack" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
];

/** Items expiring within this many days (inclusive) count as "expiring soon". */
export const EXPIRING_SOON_DAYS = 2;

export type ExpiryStatus = "expired" | "expiring_soon" | "fresh" | "no_expiry";

/** Whole days from `today` to `date` (both YYYY-MM-DD). */
export function daysBetween(today: string, date: string) {
  return Math.round((Date.parse(date + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000);
}

export function expiryStatus(expiresOn: string | null, today: string): { status: ExpiryStatus; days: number | null } {
  if (!expiresOn) return { status: "no_expiry", days: null };
  const days = daysBetween(today, expiresOn);
  return { status: days < 0 ? "expired" : days <= EXPIRING_SOON_DAYS ? "expiring_soon" : "fresh", days };
}

export function formatQuantity(quantity: number | string, unit: FridgeUnit) {
  const n = Number(quantity);
  const num = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  const label = FRIDGE_UNITS.find((u) => u.value === unit)?.label ?? unit;
  return unit === "pcs" || unit === "pack" ? `${num} ${label}` : `${num}${label === "L" ? " L" : label}`;
}

export function relativeExpiry(days: number | null) {
  if (days === null) return "No expiry";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days < 0) return `Expired ${-days}d ago`;
  return `Expires in ${days}d`;
}

export function locationIcon(loc: FridgeLocation) {
  return FRIDGE_LOCATIONS.find((l) => l.value === loc)?.icon ?? "•";
}

/** Sort: expired first, then soonest expiry, then items with no expiry by name. */
export function sortByExpiry<T extends Pick<FridgeItem, "expires_on" | "name">>(items: T[]) {
  return [...items].sort((a, b) => {
    if (a.expires_on && b.expires_on) return a.expires_on.localeCompare(b.expires_on) || a.name.localeCompare(b.name);
    if (a.expires_on) return -1;
    if (b.expires_on) return 1;
    return a.name.localeCompare(b.name);
  });
}

type DigestItem = Pick<FridgeItem, "name" | "location" | "quantity" | "unit" | "expires_on">;

/** Lines for the daily digest: expired + expiring within EXPIRING_SOON_DAYS. Empty when nothing to report. */
export function fridgeDigestSection(items: DigestItem[], today: string): string[] {
  const flagged = sortByExpiry(items).filter((i) => {
    const { status } = expiryStatus(i.expires_on, today);
    return status === "expired" || status === "expiring_soon";
  });
  if (!flagged.length) return [];
  return [
    `🥬 Fridge: expiring soon (${flagged.length})`,
    ...flagged.map((i) => {
      const { days } = expiryStatus(i.expires_on, today);
      const when = days === 0 ? "today" : days === 1 ? "tomorrow" : days! < 0 ? `expired ${-days!}d ago` : `in ${days}d`;
      return `${locationIcon(i.location)} ${i.name} (${formatQuantity(i.quantity, i.unit)}) — ${when}`;
    }),
  ];
}

/** Full inventory text for the LINE `/fridge` command. */
export function fridgeInventoryText(items: DigestItem[], today: string, appUrl: string) {
  const parts: string[] = ["🧊 Fridge inventory"];
  if (!items.length) parts.push("", "Empty. Nothing tracked.");
  for (const loc of FRIDGE_LOCATIONS) {
    const here = sortByExpiry(items.filter((i) => i.location === loc.value));
    if (!here.length) continue;
    parts.push("", `${loc.icon} ${loc.label} (${here.length})`);
    for (const i of here) {
      const { status, days } = expiryStatus(i.expires_on, today);
      const flag = status === "expired" ? "⚠️ " : status === "expiring_soon" ? "⏰ " : "";
      const when = i.expires_on ? ` — ${days! < 0 ? `expired ${-days!}d ago` : days === 0 ? "today" : days === 1 ? "tomorrow" : `${days}d left`}` : "";
      parts.push(`${flag}${i.name} (${formatQuantity(i.quantity, i.unit)})${when}`);
    }
  }
  if (appUrl) parts.push("", `${appUrl}/fridge`);
  return parts.join("\n");
}
