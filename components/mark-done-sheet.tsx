"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { SubmitButton } from "@/components/submit-button";
import { markDone } from "@/app/(app)/tasks/actions";
import type { ActionState } from "@/lib/types";
import { CURRENCY } from "@/lib/format";

type Props = {
  taskId: string;
  title: string;
  estimatedCost?: number | null;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
};

export function MarkDoneSheet({ taskId, title, estimatedCost, size = "sm", variant = "default" }: Props) {
  const [open, setOpen] = useState(false);
  const [, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await markDone(prev, fd);
    if (result?.success) {
      toast.success(result.success);
      setOpen(false);
    } else if (result?.error) {
      toast.error(result.error);
    }
    return result;
  }, undefined);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button size={size} variant={variant} />}>
        <CheckCircle2 aria-hidden /> Done
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="task_id" value={taskId} />
          <SheetHeader>
            <SheetTitle>Mark done</SheetTitle>
            <SheetDescription>{title}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-1.5">
              <Label htmlFor="completed_on">Date</Label>
              <Input id="completed_on" name="completed_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cost">Cost ({CURRENCY}) <span className="text-muted-foreground">optional</span></Label>
              <Input id="cost" name="cost" type="number" inputMode="decimal" min={0} step="0.01" placeholder={estimatedCost ? String(estimatedCost) : "0"} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="photo">Photo <span className="text-muted-foreground">optional</span></Label>
              <Input id="photo" name="photo" type="file" accept="image/*" capture="environment" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground">optional</span></Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="What was done, who did it…" />
            </div>
          </div>
          <SheetFooter>
            <SubmitButton size="lg" className="w-full">Save completion</SubmitButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
