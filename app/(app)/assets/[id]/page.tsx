import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { AssetArchiveButton } from "@/components/asset-archive-button";
import { requireSession } from "@/lib/auth";
import { formatDate, formatMoney, todayISO } from "@/lib/format";
import type { Asset, TaskDue } from "@/lib/types";

type Detail = Asset & { categories: { name: string; icon: string | null } | null };
type Row = TaskDue & { categories: { name: string; icon: string | null } | null };

export default async function AssetDetailPage({ params }: PageProps<"/assets/[id]">) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const [{ data: asset }, { data: dueTasks }, { data: inactiveTasks }, { data: spend }] = await Promise.all([
    supabase.from("assets").select("*, categories(name, icon)").eq("id", id).maybeSingle<Detail>(),
    supabase.from("task_due").select("*, categories(name, icon), contacts(name)").eq("asset_id", id).order("due_on", { ascending: true, nullsFirst: false }).returns<Row[]>(),
    supabase.from("tasks").select("*, categories(name, icon), contacts(name)").eq("asset_id", id).or("paused_at.not.is.null,archived_at.not.is.null").order("title"),
    supabase.from("task_completions").select("cost, tasks!inner(asset_id)").eq("tasks.asset_id", id),
  ]);
  if (!asset) notFound();

  const today = todayISO();
  const totalSpend = (spend ?? []).reduce((s, c) => s + Number(c.cost ?? 0), 0);
  const inactive = (inactiveTasks ?? []).map((t) => ({ ...t, last_completed_at: null, completion_count: 0, due_on: null, status: "done" as const, days_until_due: null })) as Row[];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={asset.name}
        description={[asset.categories?.name, asset.brand, asset.model].filter(Boolean).join(" · ") || undefined}
        action={
          <Button render={<Link href={`/assets/${asset.id}/edit`} />} variant="outline" size="sm"><Pencil aria-hidden /> Edit</Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Serial</dt><dd className="font-mono">{asset.serial ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Purchased</dt><dd>{formatDate(asset.purchased_at)}</dd></div>
            <div>
              <dt className="text-muted-foreground">Warranty</dt>
              <dd>
                {asset.warranty_until ? formatDate(asset.warranty_until) : "—"}
                {asset.warranty_until && <span className="ml-1 text-xs text-muted-foreground">{asset.warranty_until >= today ? "(active)" : "(expired)"}</span>}
              </dd>
            </div>
            <div><dt className="text-muted-foreground">Total spent</dt><dd>{formatMoney(totalSpend)}</dd></div>
          </dl>
          {asset.notes && <p className="text-sm whitespace-pre-wrap text-muted-foreground">{asset.notes}</p>}
          <div className="flex gap-2">
            <AssetArchiveButton id={asset.id} archived={!!asset.archived_at} />
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Linked tasks</h2>
          <Button render={<Link href={`/tasks/new?asset=${asset.id}`} />} variant="ghost" size="sm"><Plus aria-hidden /> Task</Button>
        </div>
        {!dueTasks?.length && !inactive.length ? (
          <p className="py-3 text-sm text-muted-foreground">No tasks linked to this asset yet.</p>
        ) : (
          <ul className="divide-y">
            {(dueTasks ?? []).map((t) => <TaskRow key={t.id} task={t} showStatus />)}
            {inactive.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
