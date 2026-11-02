import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { ContactArchiveButton, ContactChannels } from "@/components/contact-actions";
import { requireSession } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import type { Contact, TaskDue } from "@/lib/types";

type Detail = Contact & { categories: { name: string; icon: string | null } | null };
type Row = TaskDue & { categories: { name: string; icon: string | null } | null };
type Job = { id: string; completed_at: string; cost: number | null; notes: string | null; tasks: { id: string; title: string } | null };

export default async function ContactDetailPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const [{ data: contact }, { data: dueTasks }, { data: jobs }] = await Promise.all([
    supabase.from("contacts").select("*, categories(name, icon)").eq("id", id).maybeSingle<Detail>(),
    supabase.from("task_due").select("*, categories(name, icon)").eq("contact_id", id).order("due_on", { ascending: true, nullsFirst: false }).returns<Row[]>(),
    supabase.from("task_completions").select("id, completed_at, cost, notes, tasks(id, title)").eq("contact_id", id).order("completed_at", { ascending: false }).returns<Job[]>(),
  ]);
  if (!contact) notFound();

  const totalPaid = (jobs ?? []).reduce((s, j) => s + Number(j.cost ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={contact.name}
        description={[contact.role, contact.company, contact.categories?.name].filter(Boolean).join(" · ") || undefined}
        action={<Button render={<Link href={`/contacts/${contact.id}/edit`} />} variant="outline" size="sm"><Pencil aria-hidden /> Edit</Button>}
      />
      <Card>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Phone</dt><dd className="tabular-nums">{contact.phone ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">LINE</dt><dd>{contact.line_id ?? "—"}</dd></div>
            <div className="col-span-2"><dt className="text-muted-foreground">Email</dt><dd className="truncate">{contact.email ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Jobs done</dt><dd>{jobs?.length ?? 0}</dd></div>
            <div><dt className="text-muted-foreground">Total paid</dt><dd>{formatMoney(totalPaid)}</dd></div>
          </dl>
          {contact.notes && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{contact.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <ContactChannels contact={contact} />
            <ContactArchiveButton id={contact.id} archived={!!contact.archived_at} />
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Assigned tasks</h2>
          <Button render={<Link href={`/tasks/new?contact=${contact.id}`} />} variant="ghost" size="sm"><Plus aria-hidden /> Task</Button>
        </div>
        {!dueTasks?.length ? (
          <p className="py-3 text-sm text-muted-foreground">No active tasks assigned.</p>
        ) : (
          <ul className="divide-y">{dueTasks.map((t) => <TaskRow key={t.id} task={t} showStatus />)}</ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Job history</h2>
        {!jobs?.length ? (
          <p className="py-3 text-sm text-muted-foreground">No completed jobs recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {jobs.map((j) => (
              <li key={j.id} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  {j.tasks ? (
                    <Link href={`/tasks/${j.tasks.id}`} className="truncate font-medium underline-offset-4 hover:underline">{j.tasks.title}</Link>
                  ) : <span className="font-medium">Deleted task</span>}
                  <span className="shrink-0 tabular-nums text-muted-foreground">{j.cost !== null ? formatMoney(j.cost) : ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(j.completed_at)}{j.notes ? ` · ${j.notes}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
