"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendLineTest } from "@/app/(app)/settings/actions";

export function LineTestButton({ disabled }: { disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="w-fit"
      disabled={disabled || pending}
      onClick={() => start(async () => {
        const r = await sendLineTest();
        if (r?.error) toast.error(r.error); else toast.success(r?.success ?? "Sent");
      })}
    >
      <Send aria-hidden /> Send test digest now
    </Button>
  );
}
