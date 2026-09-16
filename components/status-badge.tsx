import { Badge } from "@/components/ui/badge";
import type { DueStatus } from "@/lib/types";

const map: Record<DueStatus, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  due_soon: { label: "Due soon", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  upcoming: { label: "Upcoming", className: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
  done: { label: "Done", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: DueStatus | "paused" | "archived" }) {
  if (status === "paused") return <Badge variant="outline">Paused</Badge>;
  if (status === "archived") return <Badge variant="outline">Archived</Badge>;
  const s = map[status];
  return <Badge className={s.className}>{s.label}</Badge>;
}
