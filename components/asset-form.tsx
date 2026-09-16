"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState, Asset, Category } from "@/lib/types";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  categories: Pick<Category, "id" | "name" | "icon">[];
  asset?: Asset;
  submitLabel?: string;
};

export function AssetForm({ action, categories, asset, submitLabel = "Save asset" }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  return (
    <form action={formAction} className="grid gap-5">
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={asset?.name ?? ""} placeholder="Living room AC" autoFocus />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="category_id">Category</Label>
        <NativeSelect id="category_id" name="category_id" defaultValue={asset?.category_id ?? ""}>
          <NativeSelectOption value="">None</NativeSelectOption>
          {categories.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label htmlFor="brand">Brand</Label><Input id="brand" name="brand" defaultValue={asset?.brand ?? ""} /></div>
        <div className="grid gap-1.5"><Label htmlFor="model">Model</Label><Input id="model" name="model" defaultValue={asset?.model ?? ""} /></div>
      </div>
      <div className="grid gap-1.5"><Label htmlFor="serial">Serial number</Label><Input id="serial" name="serial" defaultValue={asset?.serial ?? ""} className="font-mono" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label htmlFor="purchased_at">Purchased</Label><Input id="purchased_at" name="purchased_at" type="date" defaultValue={asset?.purchased_at ?? ""} /></div>
        <div className="grid gap-1.5"><Label htmlFor="warranty_until">Warranty until</Label><Input id="warranty_until" name="warranty_until" type="date" defaultValue={asset?.warranty_until ?? ""} /></div>
      </div>
      <div className="grid gap-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={3} defaultValue={asset?.notes ?? ""} /></div>
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
