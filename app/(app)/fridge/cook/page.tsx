import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { SubmitButton } from "@/components/submit-button";
import { suggestMenu } from "./actions";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MenuRefreshButton } from "@/components/menu-refresh-button";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { foodEmoji } from "@/lib/food-emoji";
import { FRIDGE_LOCATIONS, expiryStatus } from "@/lib/fridge";
import {
  CUISINES,
  getCachedMenu,
  loadInventory,
  parseMenuFilters,
  type InventoryItem,
  type MenuDish,
  type MenuFilters,
  type MenuSuggestions,
} from "@/lib/menu";
import { cn } from "@/lib/utils";

export const metadata = { title: "What to cook" };

function DishCard({ dish, rank }: { dish: MenuDish; rank: number }) {
  return (
    <li className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            <span className="mr-1.5 text-muted-foreground tabular-nums">{rank}.</span>
            {dish.name}
          </h2>
          <p className="text-xs font-medium text-muted-foreground">{CUISINES.find((c) => c.value === dish.cuisine)?.th ?? dish.cuisine}</p>
          <p className="text-sm text-muted-foreground">{dish.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden /> {dish.time_minutes} นาที</span>
          <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {dish.servings} ที่</span>
        </div>
      </div>

      {dish.uses.length > 0 && (
        <ul aria-label="From the fridge" className="mt-3 flex flex-wrap gap-1.5">
          {dish.uses.map((u, i) => (
            <li
              key={i}
              className={cn(
                "rounded-full bg-muted px-2 py-0.5 text-xs",
                u.expiring && "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
              )}
              title={u.expiring ? "Expiring soon" : undefined}
            >
              <span aria-hidden>{u.emoji}</span> {u.name} · {u.amount}
              {u.expiring && <span className="sr-only"> (expiring soon)</span>}
            </li>
          ))}
        </ul>
      )}

      {dish.missing.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">ต้องเพิ่ม:</span>{" "}
          {dish.missing.map((m) => (m.optional ? `${m.name} (ไม่ใส่ก็ได้)` : m.name)).join(", ")}
        </p>
      )}

      <details className="mt-3 group">
        <summary className="cursor-pointer text-sm font-medium text-primary">วิธีทำ</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {dish.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </details>
    </li>
  );
}

const chip =
  "cursor-pointer rounded-full border px-2.5 py-1 text-xs select-none has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

/** The model is only called when this form is submitted; the selection then lives in the URL (`?main=<id>&cuisine=thai`). */
function FilterForm({ items, filters, today, open }: { items: InventoryItem[]; filters: MenuFilters; today: string; open: boolean }) {
  const active = filters.mainIds.length + filters.cuisines.length;
  return (
    <details open={open || active > 0} className="rounded-xl border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Main ingredients &amp; cuisine{active > 0 && <span className="ml-1 text-muted-foreground">({active} selected)</span>}
      </summary>
      <form action={suggestMenu} className="mt-3 flex flex-col gap-4">
        {FRIDGE_LOCATIONS.map((loc) => {
          const here = items.filter((i) => i.location === loc.value);
          if (!here.length) return null;
          return (
            <fieldset key={loc.value}>
              <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <span aria-hidden>{loc.icon}</span> {loc.label}
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {here.map((i) => {
                  const { status } = expiryStatus(i.expires_on, today);
                  return (
                    <label key={i.id} className={chip}>
                      <input type="checkbox" name="main" value={i.id} defaultChecked={filters.mainIds.includes(i.id)} className="sr-only" />
                      <span aria-hidden>{i.food_catalog?.emoji ?? foodEmoji(i.name, i.unit, i.location)}</span> {i.name}
                      {(status === "expired" || status === "expiring_soon") && <span title="Expiring soon"> ⏰</span>}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cuisine</legend>
          <div className="flex flex-wrap gap-1.5">
            {CUISINES.map((c) => (
              <label key={c.value} className={chip}>
                <input type="checkbox" name="cuisine" value={c.value} defaultChecked={filters.cuisines.includes(c.value)} className="sr-only" />
                {c.label} · {c.th}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-muted-foreground">Nothing selected = any ingredient, mostly Thai.</p>
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton size="sm">Suggest dishes</SubmitButton>
          {active > 0 && <Button render={<Link href="/fridge/cook" />} size="sm" variant="ghost">Clear</Button>}
          <span className="text-xs text-muted-foreground">Can take up to a minute.</span>
        </div>
      </form>
    </details>
  );
}

function Suggestions({ menu }: { menu: MenuSuggestions }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Items marked <span className="rounded-full bg-amber-100 px-1.5 text-amber-900 dark:bg-amber-950 dark:text-amber-200">amber</span> expire
        soon. Suggestions only: your inventory isn&apos;t changed.
      </p>
      <ol className="flex flex-col gap-3">
        {menu.dishes.map((d, i) => <DishCard key={i} dish={d} rank={i + 1} />)}
      </ol>
    </div>
  );
}

export default async function CookPage({ searchParams }: PageProps<"/fridge/cook">) {
  const sp = await searchParams;
  const { supabase, householdId } = await requireSession();
  const items = await loadInventory(supabase, householdId);
  const today = todayISO();
  // Drop selected items that are no longer in the fridge.
  const parsed = parseMenuFilters(sp.main, sp.cuisine);
  const filters = { ...parsed, mainIds: parsed.mainIds.filter((id) => items.some((i) => i.id === id)) };

  // Only saved suggestions are shown on load; the model runs when "Suggest dishes" or "New ideas" is pressed.
  const menu = items.length ? await getCachedMenu(supabase, householdId, filters, items) : null;
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="What to cook"
        description="Thai dishes from what's in your fridge, using items that expire soon first."
        breadcrumb={[{ label: "Fridge", href: "/fridge" }]}
        action={menu && <MenuRefreshButton filters={filters} />}
      />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          Couldn&apos;t get suggestions: {error}
        </p>
      )}
      {!items.length ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
          <p>The fridge is empty. Add some food first.</p>
          <Button render={<Link href="/fridge/new" />} size="sm">Add food</Button>
        </div>
      ) : (
        <>
          <FilterForm items={items} filters={filters} today={today} open={!menu} />
          {menu ? (
            <Suggestions menu={menu} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Pick main ingredients and cuisines (or none), then press <b>Suggest dishes</b>.
            </p>
          )}
        </>
      )}
    </div>
  );
}
