import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Payments" };

type Row = {
  id: string;
  completed_at: string;
  cost: number;
  tasks: { id: string; title: string; categories: { name: string; icon: string | null } | null } | null;
};

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const sp = await searchParams;
  const { supabase, householdId } = await requireSession();
  const { data } = await supabase
    .from("task_completions")
    .select("id, completed_at, cost, tasks(id, title, categories(name, icon))")
    .eq("household_id", householdId)
    .not("cost", "is", null)
    .gt("cost", 0)
    .order("completed_at", { ascending: false })
    .returns<Row[]>();

  const rows = data ?? [];
  const byYear = new Map<number, number>();
  for (const r of rows) {
    const y = new Date(r.completed_at).getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + Number(r.cost));
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();
  const requested = typeof sp.year === "string" ? Number(sp.year) : NaN;
  const year = years.includes(requested) ? requested : years[0] ?? currentYear;

  const yearRows = rows.filter((r) => new Date(r.completed_at).getFullYear() === year);
  const byCategory = new Map<string, { icon: string | null; total: number; count: number }>();
  for (const r of yearRows) {
    const name = r.tasks?.categories?.name ?? "Uncategorised";
    const cur = byCategory.get(name) ?? { icon: r.tasks?.categories?.icon ?? null, total: 0, count: 0 };
    cur.total += Number(r.cost);
    cur.count += 1;
    byCategory.set(name, cur);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total);
  const yearTotal = byYear.get(year) ?? 0;
  const max = categories[0]?.[1].total ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" description="Costs logged on completions." />

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No costs recorded yet. Add a cost when you mark a task done.</p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto">
            {(years.length ? years : [currentYear]).map((y) => (
              <Link
                key={y}
                href={`/payments?year=${y}`}
                aria-current={y === year ? "page" : undefined}
                className={cn("rounded-full border px-3 py-1 text-sm", y === year ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground")}
              >
                {y}
              </Link>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-baseline justify-between">
                <span>{year} total</span>
                <span className="text-2xl tabular-nums">{formatMoney(yearTotal)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3">
                {categories.map(([name, c]) => (
                  <li key={name} className="grid gap-1 text-sm">
                    <div className="flex justify-between">
                      <span>{c.icon ? `${c.icon} ` : ""}{name} <span className="text-muted-foreground">· {c.count}</span></span>
                      <span className="tabular-nums">{formatMoney(c.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (c.total / max) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <section>
            <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">By year</h2>
            <ul className="divide-y text-sm">
              {years.map((y) => (
                <li key={y} className="flex justify-between py-2">
                  <span>{y}</span><span className="tabular-nums">{formatMoney(byYear.get(y))}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">{year} entries</h2>
            <ul className="divide-y text-sm">
              {yearRows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2">
                  <span aria-hidden className="w-5 text-center">{r.tasks?.categories?.icon ?? "✓"}</span>
                  <Link href={r.tasks ? `/tasks/${r.tasks.id}` : "#"} className="min-w-0 flex-1 truncate">{r.tasks?.title ?? "Deleted task"}</Link>
                  <span className="text-muted-foreground">{formatDate(r.completed_at)}</span>
                  <span className="tabular-nums">{formatMoney(r.cost)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
