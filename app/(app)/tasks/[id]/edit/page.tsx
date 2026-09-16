import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { requireSession } from "@/lib/auth";
import type { Task } from "@/lib/types";
import { updateTask } from "../../actions";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: PageProps<"/tasks/[id]/edit">) {
  const { id } = await params;
  const { supabase, householdId } = await requireSession();
  const [{ data: task }, { data: categories }, { data: assets }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).maybeSingle<Task>(),
    supabase.from("categories").select("id, name, icon").eq("household_id", householdId).order("sort_order"),
    supabase.from("assets").select("id, name").eq("household_id", householdId).is("archived_at", null).order("name"),
  ]);
  if (!task) notFound();
  const action = updateTask.bind(null, task.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit task" description={task.title} />
      <TaskForm action={action} categories={categories ?? []} assets={assets ?? []} task={task} />
    </div>
  );
}
