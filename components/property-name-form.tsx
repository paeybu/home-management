"use client";

import { useActionState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { updatePropertyName } from "@/app/(app)/settings/actions";
import type { ActionState } from "@/lib/types";

export function PropertyNameForm({ name, canEdit }: { name: string; canEdit: boolean }) {
  const [, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await updatePropertyName(prev, fd);
    if (r?.success) toast.success(r.success);
    if (r?.error) toast.error(r.error);
    return r;
  }, undefined);

  return (
    <form action={action} className="flex items-center gap-2">
      <Input
        name="name"
        defaultValue={name}
        aria-label="Property name"
        placeholder="e.g. Sukhumvit condo"
        required
        maxLength={80}
        disabled={!canEdit}
        className="flex-1"
      />
      {canEdit && <SubmitButton>Save</SubmitButton>}
    </form>
  );
}
