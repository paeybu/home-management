"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/submit-button";
import { useContacts } from "@/components/contacts-provider";
import { updateCompletion } from "@/app/(app)/tasks/actions";
import { contactLabel } from "@/lib/contacts";
import { CURRENCY } from "@/lib/format";
import type { ActionState, TaskCompletion } from "@/lib/types";

type Props = {
  completion: Pick<TaskCompletion, "id" | "completed_at" | "contact_id" | "cost" | "notes" | "photo_path">;
  contactName?: string | null;
};

export function EditCompletionSheet({ completion: c, contactName }: Props) {
  const [open, setOpen] = useState(false);
  const contacts = useContacts();
  const [, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const result = await updateCompletion(c.id, prev, fd);
    if (result?.success) {
      toast.success(result.success);
      setOpen(false);
    } else if (result?.error) {
      toast.error(result.error);
    }
    return result;
  }, undefined);

  // Keep an archived contact selectable so editing doesn't silently unassign it.
  const assignedMissing = c.contact_id && !contacts.some((x) => x.id === c.contact_id);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Edit completion" />}>
        <Pencil aria-hidden />
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <form action={action} className="flex flex-col gap-4">
          <SheetHeader>
            <SheetTitle>Edit completion</SheetTitle>
            <SheetDescription>Change the date, who did it, cost, notes or photo.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <div className="grid gap-1.5">
              <Label htmlFor={`completed_on-${c.id}`}>Date</Label>
              <Input id={`completed_on-${c.id}`} name="completed_on" type="date" required defaultValue={new Date(c.completed_at).toISOString().slice(0, 10)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`contact_id-${c.id}`}>Done by</Label>
              <NativeSelect id={`contact_id-${c.id}`} name="contact_id" defaultValue={c.contact_id ?? ""}>
                <NativeSelectOption value="">Me</NativeSelectOption>
                {assignedMissing && <NativeSelectOption value={c.contact_id!}>{contactName ?? "Archived contact"}</NativeSelectOption>}
                {contacts.map((x) => <NativeSelectOption key={x.id} value={x.id}>{contactLabel(x)}</NativeSelectOption>)}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`cost-${c.id}`}>Cost ({CURRENCY}) <span className="text-muted-foreground">optional</span></Label>
              <Input id={`cost-${c.id}`} name="cost" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={c.cost ?? ""} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`photo-${c.id}`}>{c.photo_path ? "Replace photo" : "Photo"} <span className="text-muted-foreground">optional</span></Label>
              <Input id={`photo-${c.id}`} name="photo" type="file" accept="image/*" />
              {c.photo_path && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" name="remove_photo" className="size-4" /> Remove current photo
                </label>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`notes-${c.id}`}>Notes <span className="text-muted-foreground">optional</span></Label>
              <Textarea id={`notes-${c.id}`} name="notes" rows={2} defaultValue={c.notes ?? ""} />
            </div>
          </div>
          <SheetFooter>
            <SubmitButton size="lg" className="w-full">Save changes</SubmitButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
