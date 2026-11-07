"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/submit-button";
import { FRIDGE_LOCATIONS, FRIDGE_UNITS } from "@/lib/fridge";
import type { ActionState, FridgeItem, FridgeLocation } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  item?: FridgeItem;
  defaultLocation?: FridgeLocation;
  today: string;
  submitLabel?: string;
};

const QUICK_EXPIRY = [
  { label: "+3 days", days: 3 },
  { label: "+1 week", days: 7 },
  { label: "+2 weeks", days: 14 },
  { label: "+1 month", days: 30 },
  { label: "+3 months", days: 90 },
];

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function FridgeForm({ action, item, defaultLocation = "fridge", today, submitLabel = "Save item" }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const expiresRef = useRef<HTMLInputElement>(null);
  const location = item?.location ?? defaultLocation;

  return (
    <form action={formAction} className="grid gap-5">
      {state?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={item?.name ?? ""} placeholder="Milk" autoFocus={!item} />
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Location</legend>
        <div className="grid grid-cols-2 gap-2">
          {FRIDGE_LOCATIONS.map((l) => (
            <label
              key={l.value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                "has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              )}
            >
              <input type="radio" name="location" value={l.value} defaultChecked={location === l.value} className="sr-only" />
              <span aria-hidden>{l.icon}</span> {l.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" inputMode="decimal" min="0.01" step="any" required defaultValue={item?.quantity ?? 1} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="unit">Unit</Label>
          <NativeSelect id="unit" name="unit" defaultValue={item?.unit ?? "pcs"} className="w-24">
            {FRIDGE_UNITS.map((u) => <NativeSelectOption key={u.value} value={u.value}>{u.label}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="expires_on">Expires</Label>
        <Input ref={expiresRef} id="expires_on" name="expires_on" type="date" defaultValue={item?.expires_on ?? ""} />
        <div className="flex flex-wrap gap-1.5">
          {QUICK_EXPIRY.map((q) => (
            <Button
              key={q.days}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { if (expiresRef.current) expiresRef.current.value = addDays(today, q.days); }}
            >
              {q.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => { if (expiresRef.current) expiresRef.current.value = ""; }}>
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5"><Label htmlFor="added_on">Added</Label><Input id="added_on" name="added_on" type="date" defaultValue={item?.added_on ?? today} /></div>
        <div className="grid gap-1.5"><Label htmlFor="opened_on">Opened</Label><Input id="opened_on" name="opened_on" type="date" defaultValue={item?.opened_on ?? ""} /></div>
      </div>

      <div className="grid gap-1.5"><Label htmlFor="notes">Notes</Label><Textarea id="notes" name="notes" rows={2} defaultValue={item?.notes ?? ""} /></div>
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
