import { PageHeader } from "@/components/page-header";
import { TaskForm } from "@/components/task-form";
import { requireSession } from "@/lib/auth";
import { createTask } from "../actions";

export const metadata = { title: "New task" };

export default async function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  const sp = await searchParams;
  const { supabase, householdId } = await requireSession();
  const [{ data: categories }, { data: assets }] = await Promise.all([
    supabase.from("categories").select("id, name, icon").eq("household_id", householdId).order("sort_order"),
    supabase.from("assets").select("id, name").eq("household_id", householdId).is("archived_at", null).order("name"),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New task" />
      <TaskForm action={createTask} categories={categories ?? []} assets={assets ?? []} defaultAssetId={typeof sp.asset === "string" ? sp.asset : undefined} defaultContactId={typeof sp.contact === "string" ? sp.contact : undefined} submitLabel="Create task" />
    </div>
  );
}
