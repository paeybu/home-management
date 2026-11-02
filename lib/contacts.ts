import type { Contact } from "@/lib/types";

type Reachable = Pick<Contact, "phone" | "email" | "line_id">;

/** Formats digits as xxx-xxx-xxxx, progressively while typing ("0812" -> "081-2"). Max 10 digits. */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join("-");
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const lineHref = (lineId: string) => `https://line.me/ti/p/~${encodeURIComponent(lineId)}`;
export const mailHref = (email: string) => `mailto:${email}`;

export function hasChannel(c: Reachable) {
  return !!(c.phone || c.email || c.line_id);
}

/** Case-insensitive match on name/company/role/notes; phone matches on digits only so "081 234" finds "0812345678". */
export function matchesContact(
  c: Pick<Contact, "name" | "company" | "role" | "notes" | "phone" | "email" | "line_id"> & { categories?: { name: string } | null },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [c.name, c.company, c.role, c.notes, c.email, c.line_id, c.categories?.name].filter(Boolean).join(" ").toLowerCase();
  if (q.split(/\s+/).every((w) => text.includes(w))) return true;
  const digits = q.replace(/\D/g, "");
  return digits.length >= 3 && !!c.phone && c.phone.replace(/\D/g, "").includes(digits);
}

/** Display label for selects: "Somchai (Gardener)". */
export function contactLabel(c: Pick<Contact, "name" | "role" | "company">) {
  const extra = c.role ?? c.company;
  return extra ? `${c.name} (${extra})` : c.name;
}
