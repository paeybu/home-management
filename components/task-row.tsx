import Link from "next/link";
import { MarkDoneSheet } from "@/components/mark-done-sheet";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, relativeDue } from "@/lib/format";
import type { TaskDue } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = Pick<TaskDue, "id" | "title" | "due_on" | "status" | "days_until_due" | "estimated_cost" | "paused_at" | "archived_at"> & {
  categories?: { name: string; icon: string | null } | null;
};

export function TaskRow({ task, showStatus = false }: { task: Row; showStatus?: boolean }) {
  const inactive = !!task.archived_at || !!task.paused_at;
  return (
    <li className="flex items-center gap-3 py-3">
      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {task.categories?.icon && <span aria-hidden className="shrink-0 text-base">{task.categories.icon}</span>}
          <span className={cn("truncate font-medium", inactive && "text-muted-foreground")}>{task.title}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {task.archived_at ? (
            <span>Archived</span>
          ) : task.paused_at ? (
            <span>Paused</span>
          ) : task.due_on ? (
            <>
              <span className={cn(task.status === "overdue" && "font-medium text-red-700 dark:text-red-300")}>
                {relativeDue(task.days_until_due)}
              </span>
              <span aria-hidden>·</span>
              <span>{formatDate(task.due_on)}</span>
            </>
          ) : (
            <span>Completed</span>
          )}
          {task.categories?.name && (
            <>
              <span aria-hidden>·</span>
              <span>{task.categories.name}</span>
            </>
          )}
        </div>
      </Link>
      {showStatus && !inactive && <StatusBadge status={task.status} />}
      {!inactive && task.status !== "done" && (
        <MarkDoneSheet taskId={task.id} title={task.title} estimatedCost={task.estimated_cost} variant={task.status === "overdue" ? "default" : "outline"} />
      )}
    </li>
  );
}
