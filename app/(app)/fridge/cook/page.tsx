import { Suspense } from "react";
import Link from "next/link";
import { Clock, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { MenuRefreshButton } from "@/components/menu-refresh-button";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getMenuSuggestions, type MenuDish } from "@/lib/menu";
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

async function Suggestions() {
  const { supabase, householdId } = await requireSession();
  let menu;
  try {
    menu = await getMenuSuggestions(supabase, householdId, todayISO());
  } catch (e) {
    console.error("[menu] suggestions failed:", e);
    return (
      <p role="alert" className="py-8 text-center text-sm text-red-700 dark:text-red-300">
        Couldn&apos;t get suggestions: {e instanceof Error ? e.message : "unknown error"}. Tap <b>New ideas</b> to try again.
      </p>
    );
  }

  if (!menu) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
        <p>The fridge is empty. Add some food first.</p>
        <Button render={<Link href="/fridge/new" />} size="sm">Add food</Button>
      </div>
    );
  }

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

export default function CookPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="What to cook"
        description="Thai dishes from what's in your fridge, using items that expire soon first."
        breadcrumb={[{ label: "Fridge", href: "/fridge" }]}
        action={<MenuRefreshButton />}
      />
      <Suspense
        fallback={
          <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden /> กำลังคิดเมนูจากของในตู้เย็น… (up to a minute)
          </p>
        }
      >
        <Suggestions />
      </Suspense>
    </div>
  );
}
