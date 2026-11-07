import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { FridgeItemRow } from "@/components/fridge-item-row";
import { requireSession } from "@/lib/auth";
import { FRIDGE_LOCATIONS, expiryStatus, sortByExpiry } from "@/lib/fridge";
import { todayISO } from "@/lib/format";
import type { FridgeItem, FridgeLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Fridge" };

function Section({ title, items, today, tone }: { title: string; items: FridgeItem[]; today: string; tone?: "danger" | "warn" }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <h2
        className={cn(
          "mb-1 flex items-baseline gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase",
          tone === "danger" && "text-red-700 dark:text-red-300",
          tone === "warn" && "text-amber-700 dark:text-amber-300",
        )}
      >
        {title} <span className="text-xs font-normal">{items.length}</span>
      </h2>
      <ul className="divide-y">
        {items.map((i) => <FridgeItemRow key={i.id} item={i} today={today} />)}
      </ul>
    </section>
  );
}

export default async function FridgePage({ searchParams }: PageProps<"/fridge">) {
  const sp = await searchParams;
  const location: FridgeLocation = FRIDGE_LOCATIONS.some((l) => l.value === sp.location) ? (sp.location as FridgeLocation) : "fridge";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const { supabase, householdId } = await requireSession();
  const { data } = await supabase
    .from("fridge_items")
    .select("*")
    .eq("household_id", householdId)
    .is("removed_at", null)
    .returns<FridgeItem[]>();
  const today = todayISO();
  const all = data ?? [];

  const counts = Object.fromEntries(FRIDGE_LOCATIONS.map((l) => [l.value, all.filter((i) => i.location === l.value).length]));
  const items = sortByExpiry(
    all.filter((i) => i.location === location && (!q || i.name.toLowerCase().includes(q.toLowerCase()))),
  );
  const byStatus = (s: string[]) => items.filter((i) => s.includes(expiryStatus(i.expires_on, today).status));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Fridge"
        action={<Button render={<Link href={`/fridge/new?location=${location}`} />} size="sm"><Plus aria-hidden /> Add</Button>}
      />

      <nav aria-label="Location" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {FRIDGE_LOCATIONS.map((l) => (
          <Link
            key={l.value}
            href={`/fridge?location=${l.value}`}
            aria-current={l.value === location ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground",
              l.value === location && "bg-background text-foreground shadow-sm",
            )}
          >
            <span aria-hidden>{l.icon}</span> {l.label}
            <span className="text-xs font-normal text-muted-foreground tabular-nums">{counts[l.value]}</span>
          </Link>
        ))}
      </nav>

      <form className="flex gap-2" action="/fridge">
        <input type="hidden" name="location" value={location} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search items…"
          aria-label="Search items"
          className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </form>

      {!items.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {q ? `No items match "${q}".` : `Nothing in the ${location} yet. Tap Add to start tracking.`}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <Section title="Expired" items={byStatus(["expired"])} today={today} tone="danger" />
          <Section title="Expiring soon" items={byStatus(["expiring_soon"])} today={today} tone="warn" />
          <Section title="Fresh" items={byStatus(["fresh", "no_expiry"])} today={today} />
        </div>
      )}
    </div>
  );
}
