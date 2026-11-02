import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { TaskFilters } from "@/components/task-filters";
import { requireSession } from "@/lib/auth";
import type { Task, TaskDue } from "@/lib/types";

export const metadata = { title: "Tasks" };

type Row = TaskDue & { categories: { name: string; icon: string | null } | null };

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : "";
  const status = typeof sp.status === "string" ? sp.status : "active";
  const contact = typeof sp.contact === "string" ? sp.contact : "";
  const { supabase, householdId } = await requireSession();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, icon")
    .eq("household_id", householdId)
    .order("sort_order");

  let rows: Row[] = [];
  if (status === "paused" || status === "archived") {
    const { data } = await supabase
      .from("tasks")
      .select("*, categories(name, icon), contacts(name)")
      .eq("household_id", householdId)
      .not(status === "paused" ? "paused_at" : "archived_at", "is", null)
      .order("title")
      .returns<(Task & { categories: Row["categories"] })[]>();
    rows = (data ?? [])
      .filter((t) => (status === "paused" ? t.archived_at === null : true))
      .map((t) => ({ ...t, last_completed_at: null, completion_count: 0, due_on: null, status: "done", days_until_due: null }));
  } else {
    const { data } = await supabase
      .from("task_due")
      .select("*, categories(name, icon), contacts(name)")
      .eq("household_id", householdId)
      .order("due_on", { ascending: true, nullsFirst: false })
      .order("title")
      .returns<Row[]>();
    rows = (data ?? []).filter((t) => (status === "active" ? t.status !== "done" : status === "all" ? true : t.status === status));
  }
  if (category) rows = rows.filter((t) => t.category_id === category);
  if (contact) rows = rows.filter((t) => (contact === "none" ? !t.contact_id : t.contact_id === contact));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tasks"
        action={
          <Button render={<Link href="/tasks/new" />} size="sm">
            <Plus aria-hidden /> New
          </Button>
        }
      />
      <TaskFilters categories={categories ?? []} category={category} status={status} contact={contact} />
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No tasks match.</p>
      ) : (
        <ul className="divide-y">
          {rows.map((t) => <TaskRow key={t.id} task={t} showStatus />)}
        </ul>
      )}
    </div>
  );
}
