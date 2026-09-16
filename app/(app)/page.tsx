import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { requireSession } from "@/lib/auth";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import type { TaskDue } from "@/lib/types";

type Row = TaskDue & { categories: { name: string; icon: string | null } | null };

function Section({ title, count, children, empty }: { title: string; count: number; children: React.ReactNode; empty: string }) {
  return (
    <section aria-labelledby={`sec-${title}`}>
      <h2 id={`sec-${title}`} className="mb-1 flex items-baseline gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title} <span className="text-xs font-normal">{count}</span>
      </h2>
      {count === 0 ? <p className="py-3 text-sm text-muted-foreground">{empty}</p> : <ul className="divide-y">{children}</ul>}
    </section>
  );
}

export default async function DashboardPage() {
  const { supabase, householdId } = await requireSession();
  const today = todayISO();
  const in30 = new Date(today + "T00:00:00");
  in30.setDate(in30.getDate() + 30);
  const monthEnd = in30.toISOString().slice(0, 10);

  const [{ data: due }, { data: recent }] = await Promise.all([
    supabase
      .from("task_due")
      .select("*, categories(name, icon)")
      .eq("household_id", householdId)
      .not("due_on", "is", null)
      .lte("due_on", monthEnd)
      .order("due_on", { ascending: true })
      .returns<Row[]>(),
    supabase
      .from("task_completions")
      .select("id, completed_at, cost, tasks(id, title, categories(icon))")
      .eq("household_id", householdId)
      .order("completed_at", { ascending: false })
      .limit(8),
  ]);

  const rows = due ?? [];
  const overdue = rows.filter((t) => t.status === "overdue");
  const thisWeek = rows.filter((t) => t.status === "due_soon");
  const thisMonth = rows.filter((t) => t.status === "upcoming");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Home"
        description={formatDate(today, { weekday: "long" })}
        action={
          <Button render={<Link href="/tasks/new" />} size="sm">
            <Plus aria-hidden /> Task
          </Button>
        }
      />

      <Section title="Overdue" count={overdue.length} empty="Nothing overdue. Nice.">
        {overdue.map((t) => <TaskRow key={t.id} task={t} />)}
      </Section>
      <Section title="This week" count={thisWeek.length} empty="Nothing due in the next 7 days.">
        {thisWeek.map((t) => <TaskRow key={t.id} task={t} />)}
      </Section>
      <Section title="This month" count={thisMonth.length} empty="Nothing else due in the next 30 days.">
        {thisMonth.map((t) => <TaskRow key={t.id} task={t} />)}
      </Section>

      <section aria-labelledby="sec-recent">
        <h2 id="sec-recent" className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Recently done</h2>
        {!recent?.length ? (
          <p className="py-3 text-sm text-muted-foreground">No completions yet.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((c) => {
              const task = c.tasks as unknown as { id: string; title: string; categories: { icon: string | null } | null } | null;
              return (
                <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span aria-hidden className="w-5 text-center">{task?.categories?.icon ?? "✓"}</span>
                  <Link href={task ? `/tasks/${task.id}` : "#"} className="min-w-0 flex-1 truncate">{task?.title ?? "Deleted task"}</Link>
                  <span className="text-muted-foreground">{formatDate(c.completed_at)}</span>
                  {c.cost !== null && <span className="tabular-nums">{formatMoney(c.cost)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
