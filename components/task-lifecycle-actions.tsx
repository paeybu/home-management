"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setTaskArchived, setTaskPaused } from "@/app/(app)/tasks/actions";

export function TaskLifecycleActions({ id, paused, archived }: { id: string; paused: boolean; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <>
      {!archived && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => start(async () => { await setTaskPaused(id, !paused); toast.success(paused ? "Task resumed" : "Task paused"); })}
        >
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />} {paused ? "Resume" : "Pause"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => { await setTaskArchived(id, !archived); toast.success(archived ? "Task restored" : "Task archived"); })}
      >
        {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />} {archived ? "Restore" : "Archive"}
      </Button>
    </>
  );
}
