"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteCompletion } from "@/app/(app)/tasks/actions";
import { formatDate, formatMoney } from "@/lib/format";
import type { TaskCompletion } from "@/lib/types";

export function CompletionList({ taskId, completions, photoUrls }: { taskId: string; completions: TaskCompletion[]; photoUrls: Record<string, string> }) {
  const [pending, start] = useTransition();
  if (completions.length === 0) return <p className="py-3 text-sm text-muted-foreground">Not completed yet.</p>;
  return (
    <ul className="divide-y">
      {completions.map((c) => (
        <li key={c.id} className="flex gap-3 py-3">
          {c.photo_path && photoUrls[c.photo_path] && (
            <a href={photoUrls[c.photo_path]} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrls[c.photo_path]} alt="Completion photo" className="size-16 rounded-lg object-cover" />
            </a>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{formatDate(c.completed_at)}</span>
              <span className="tabular-nums text-muted-foreground">{c.cost !== null ? formatMoney(c.cost) : ""}</span>
            </div>
            {c.notes && <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{c.notes}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete completion"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this completion?")) return;
              start(async () => { await deleteCompletion(c.id, taskId); toast.success("Completion deleted"); });
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </li>
      ))}
    </ul>
  );
}
