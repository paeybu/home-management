"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState, Category, Contact } from "@/lib/types";
import { formatPhone } from "@/lib/contacts";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  categories: Pick<Category, "id" | "name" | "icon">[];
  contact?: Contact;
  submitLabel?: string;
};

export function ContactForm({ action, categories, contact, submitLabel = "Save contact" }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [phone, setPhone] = useState(formatPhone(contact?.phone ?? ""));
  return (
    <form action={formAction} className="grid gap-5">
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={contact?.name ?? ""} placeholder="Somchai" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="role">Role</Label>
          <Input id="role" name="role" defaultValue={contact?.role ?? ""} placeholder="Gardener" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="category_id">Category</Label>
          <NativeSelect id="category_id" name="category_id" defaultValue={contact?.category_id ?? ""}>
            <NativeSelectOption value="">None</NativeSelectOption>
            {categories.map((c) => <NativeSelectOption key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="company">Company <span className="text-muted-foreground">optional</span></Label>
        <Input id="company" name="company" defaultValue={contact?.company ?? ""} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="off" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} maxLength={12} pattern="\d{3}-\d{3}-\d{4}" title="10 digits: xxx-xxx-xxxx" placeholder="081-234-5678" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="line_id">LINE ID</Label>
          <Input id="line_id" name="line_id" autoCapitalize="none" autoComplete="off" defaultValue={contact?.line_id ?? ""} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email <span className="text-muted-foreground">optional</span></Label>
        <Input id="email" name="email" type="email" autoComplete="off" defaultValue={contact?.email ?? ""} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes <span className="text-muted-foreground">optional</span></Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={contact?.notes ?? ""} placeholder="Rates, availability, bank account for transfers…" />
      </div>
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
