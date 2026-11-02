"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Category } from "@/lib/types";
import { useContacts } from "@/components/contacts-provider";

const STATUSES = [
  ["active", "Active"],
  ["overdue", "Overdue"],
  ["due_soon", "Due soon"],
  ["upcoming", "Upcoming"],
  ["done", "Completed one-offs"],
  ["paused", "Paused"],
  ["archived", "Archived"],
] as const;

export function TaskFilters({ categories, category, status, contact }: { categories: Pick<Category, "id" | "name" | "icon">[]; category: string; status: string; contact: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const contacts = useContacts();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <NativeSelect aria-label="Filter by status" value={status} onChange={(e) => set("status", e.target.value)}>
        {STATUSES.map(([v, l]) => <NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>)}
      </NativeSelect>
      <NativeSelect aria-label="Filter by category" value={category} onChange={(e) => set("category", e.target.value)}>
        <NativeSelectOption value="">All categories</NativeSelectOption>
        {categories.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</NativeSelectOption>)}
      </NativeSelect>
      {contacts.length > 0 && (
        <NativeSelect aria-label="Filter by assignee" value={contact} onChange={(e) => set("contact", e.target.value)} className="col-span-2">
          <NativeSelectOption value="">Anyone</NativeSelectOption>
          <NativeSelectOption value="none">Unassigned</NativeSelectOption>
          {contacts.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.name}</NativeSelectOption>)}
        </NativeSelect>
      )}
    </div>
  );
}
