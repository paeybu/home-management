"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setAssetArchived } from "@/app/(app)/assets/actions";

export function AssetArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await setAssetArchived(id, !archived); toast.success(archived ? "Asset restored" : "Asset archived"); })}
    >
      {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />} {archived ? "Restore" : "Archive"}
    </Button>
  );
}
