import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MarkDoneSheet } from "@/components/mark-done-sheet";
import { TaskLifecycleActions } from "@/components/task-lifecycle-actions";
import { CompletionList } from "@/components/completion-list";
import { ContactChannels } from "@/components/contact-actions";
import { requireSession } from "@/lib/auth";
import { describeSchedule, formatDate, formatMoney, relativeDue } from "@/lib/format";
import type { Task, TaskCompletion, TaskDue } from "@/lib/types";

type Detail = Task & {
  categories: { name: string; icon: string | null } | null;
  assets: { id: string; name: string } | null;
  contacts: { id: string; name: string; role: string | null; phone: string | null; email: string | null; line_id: string | null } | null;
};

export default async function TaskDetailPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const { supabase } = await requireSession();

  const [{ data: task }, { data: due }, { data: completions }] = await Promise.all([
    supabase.from("tasks").select("*, categories(name, icon), assets(id, name), contacts(id, name, role, phone, email, line_id)").eq("id", id).maybeSingle<Detail>(),
    supabase.from("task_due").select("due_on, status, days_until_due, last_completed_at, completion_count").eq("id", id).maybeSingle<Pick<TaskDue, "due_on" | "status" | "days_until_due" | "last_completed_at" | "completion_count">>(),
    supabase.from("task_completions").select("*, contacts(id, name)").eq("task_id", id).order("completed_at", { ascending: false }).returns<(TaskCompletion & { contacts: { id: string; name: string } | null })[]>(),
  ]);
  if (!task) notFound();

  const photoPaths = (completions ?? []).map((c) => c.photo_path).filter((p): p is string => !!p);
  const { data: signed } = photoPaths.length
    ? await supabase.storage.from("completions").createSignedUrls(photoPaths, 60 * 60)
    : { data: [] };
  const photoUrls: Record<string, string> = {};
  for (const s of signed ?? []) if (s.path && s.signedUrl) photoUrls[s.path] = s.signedUrl;

  const state = task.archived_at ? "archived" : task.paused_at ? "paused" : due?.status ?? "done";
  const totalCost = (completions ?? []).reduce((s, c) => s + Number(c.cost ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={task.title}
        description={[task.categories ? `${task.categories.icon ?? ""} ${task.categories.name}`.trim() : null, describeSchedule(task)].filter(Boolean).join(" · ")}
        action={
          <Button render={<Link href={`/tasks/${task.id}/edit`} />} variant="outline" size="sm">
            <Pencil aria-hidden /> Edit
          </Button>
        }
      />

      <Card>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Next due</p>
              <p className="text-lg font-semibold">
                {state === "paused" || state === "archived" ? "—" : due?.due_on ? formatDate(due.due_on) : "Completed"}
              </p>
              {due?.due_on && state !== "paused" && state !== "archived" && (
                <p className="text-sm text-muted-foreground">{relativeDue(due.days_until_due)}</p>
              )}
            </div>
            <StatusBadge status={state} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Last done</dt><dd>{formatDate(due?.last_completed_at ?? completions?.[0]?.completed_at ?? null)}</dd></div>
            <div><dt className="text-muted-foreground">Times done</dt><dd>{completions?.length ?? 0}</dd></div>
            <div><dt className="text-muted-foreground">Est. cost</dt><dd>{formatMoney(task.estimated_cost)}</dd></div>
            <div><dt className="text-muted-foreground">Total spent</dt><dd>{formatMoney(totalCost)}</dd></div>
          </dl>
          {task.assets && (
            <p className="text-sm">
              Asset: <Link href={`/assets/${task.assets.id}`} className="font-medium underline-offset-4 hover:underline">{task.assets.name}</Link>
            </p>
          )}
          {task.contacts && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span>
                Assigned to <Link href={`/contacts/${task.contacts.id}`} className="font-medium underline-offset-4 hover:underline">{task.contacts.name}</Link>
                {task.contacts.role && <span className="text-muted-foreground"> · {task.contacts.role}</span>}
              </span>
              <span className="flex"><ContactChannels contact={task.contacts} compact /></span>
            </div>
          )}
          {task.notes && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{task.notes}</p>}
          <div className="flex flex-wrap items-center gap-2">
            {!task.archived_at && !task.paused_at && state !== "done" && (
              <MarkDoneSheet taskId={task.id} title={task.title} estimatedCost={task.estimated_cost} contactId={task.contact_id} size="default" />
            )}
            <TaskLifecycleActions id={task.id} paused={!!task.paused_at} archived={!!task.archived_at} />
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">History</h2>
        <CompletionList taskId={task.id} completions={completions ?? []} photoUrls={photoUrls} />
      </section>
    </div>
  );
}
