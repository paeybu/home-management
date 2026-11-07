import Link from "next/link";
import { Box, ChefHat, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { FridgeItemRow } from "@/components/fridge-item-row";
import { Fridge3DView, type Fridge3DItem } from "@/components/fridge-3d/fridge-3d-view";
import { foodEmoji } from "@/lib/food-emoji";
import { resolveModel } from "@/lib/food-models";
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
  const view = sp.view === "list" ? "list" : "3d";

  const { supabase, householdId } = await requireSession();
  const { data, error } = await supabase
    .from("fridge_items")
    .select("*, food_catalog(emoji, model)")
    .eq("household_id", householdId)
    .is("removed_at", null)
    .returns<(FridgeItem & { food_catalog: { emoji: string | null; model: string | null } | null })[]>();
  // Fail loudly: an empty list here would look like the fridge was emptied.
  if (error) throw new Error(`Couldn't load fridge items: ${error.message}`);
  const today = todayISO();
  const all = data ?? [];

  const counts = Object.fromEntries(FRIDGE_LOCATIONS.map((l) => [l.value, all.filter((i) => i.location === l.value).length]));
  const items = sortByExpiry(
    all.filter((i) => i.location === location && (!q || i.name.toLowerCase().includes(q.toLowerCase()))),
  );
  const byStatus = (s: string[]) => items.filter((i) => s.includes(expiryStatus(i.expires_on, today).status));

  const header = (
    <PageHeader
      title="Fridge"
      action={
        <div className="flex gap-2">
          <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="View">
            {([["3d", "3D", Box], ["list", "List", List]] as const).map(([v, label, Icon]) => (
              <Link
                key={v}
                href={v === "list" ? `/fridge?view=list&location=${location}` : "/fridge"}
                aria-current={view === v ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground",
                  view === v && "bg-background text-foreground shadow-sm",
                )}
              >
                <Icon className="size-3.5" aria-hidden /> {label}
              </Link>
            ))}
          </div>
          <Button render={<Link href="/fridge/cook" />} size="sm" variant="outline"><ChefHat aria-hidden /> Cook</Button>
          <Button render={<Link href={`/fridge/new?location=${location}`} />} size="sm"><Plus aria-hidden /> Add</Button>
        </div>
      }
    />
  );

  if (view === "3d") {
    const items3d: Fridge3DItem[] = all.map((i) => ({
      id: i.id,
      name: i.name,
      location: i.location,
      unit: i.unit,
      quantity: Number(i.quantity),
      expires_on: i.expires_on,
      opened_on: i.opened_on,
      emoji: i.food_catalog?.emoji ?? foodEmoji(i.name, i.unit, i.location),
      model: resolveModel(i.food_catalog?.model, i.name),
    }));
    return (
      <div className="flex flex-col gap-4">
        {header}
        <Fridge3DView items={items3d} today={today} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}

      <nav aria-label="Location" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {FRIDGE_LOCATIONS.map((l) => (
          <Link
            key={l.value}
            href={`/fridge?view=list&location=${l.value}`}
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
        <input type="hidden" name="view" value="list" />
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
