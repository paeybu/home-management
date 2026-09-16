import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth";
import { formatDate, todayISO } from "@/lib/format";
import type { Asset } from "@/lib/types";

export const metadata = { title: "Assets" };

type Row = Asset & { categories: { name: string; icon: string | null } | null; tasks: { count: number }[] };

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const { supabase, householdId } = await requireSession();
  let q = supabase.from("assets").select("*, categories(name, icon), tasks(count)").eq("household_id", householdId).order("name");
  q = showArchived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  const { data } = await q.returns<Row[]>();
  const today = todayISO();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Assets"
        action={
          <Button render={<Link href="/assets/new" />} size="sm"><Plus aria-hidden /> New</Button>
        }
      />
      <div className="flex gap-2 text-sm">
        <Link href="/assets" className={!showArchived ? "font-medium" : "text-muted-foreground"}>Active</Link>
        <span aria-hidden className="text-muted-foreground">·</span>
        <Link href="/assets?archived=1" className={showArchived ? "font-medium" : "text-muted-foreground"}>Archived</Link>
      </div>
      {!data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{showArchived ? "No archived assets." : "No assets yet. Add your AC, water heater, mower…"}</p>
      ) : (
        <ul className="divide-y">
          {data.map((a) => {
            const warrantyActive = a.warranty_until && a.warranty_until >= today;
            return (
              <li key={a.id}>
                <Link href={`/assets/${a.id}`} className="flex items-center gap-3 py-3">
                  <span aria-hidden className="w-6 text-center text-lg">{a.categories?.icon ?? "📦"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[a.brand, a.model].filter(Boolean).join(" ") || a.categories?.name || "—"}
                      {a.tasks?.[0]?.count ? ` · ${a.tasks[0].count} task${a.tasks[0].count === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  {a.warranty_until && (
                    <Badge variant={warrantyActive ? "secondary" : "outline"} className="shrink-0">
                      {warrantyActive ? `Warranty to ${formatDate(a.warranty_until, { year: undefined })}` : "Warranty expired"}
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
