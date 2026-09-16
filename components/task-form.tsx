"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState, Asset, Category, IntervalUnit, ScheduleType, Task } from "@/lib/types";
import { CURRENCY } from "@/lib/format";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  categories: Pick<Category, "id" | "name" | "icon">[];
  assets: Pick<Asset, "id" | "name">[];
  task?: Task;
  defaultAssetId?: string;
  submitLabel?: string;
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function TaskForm({ action, categories, assets, task, defaultAssetId, submitLabel = "Save task" }: Props) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(task?.schedule_type ?? "rolling");
  const [unit, setUnit] = useState<IntervalUnit>(task?.interval_unit ?? "month");

  const showInterval = scheduleType !== "once";
  const isFixed = scheduleType === "fixed";
  const fixedUnit: IntervalUnit = isFixed && unit !== "year" ? "month" : unit;

  return (
    <form action={formAction} className="grid gap-5">
      {state?.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={task?.title ?? ""} placeholder="Change AC filter" autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="category_id">Category</Label>
          <NativeSelect id="category_id" name="category_id" defaultValue={task?.category_id ?? ""}>
            <NativeSelectOption value="">None</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="asset_id">Asset</Label>
          <NativeSelect id="asset_id" name="asset_id" defaultValue={task?.asset_id ?? defaultAssetId ?? ""}>
            <NativeSelectOption value="">None</NativeSelectOption>
            {assets.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>{a.name}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <fieldset className="grid gap-3 rounded-xl border p-3">
        <legend className="px-1 text-sm font-medium">Schedule</legend>
        <div className="grid gap-1.5">
          <Label htmlFor="schedule_type">Type</Label>
          <NativeSelect id="schedule_type" name="schedule_type" value={scheduleType} onChange={(e) => setScheduleType(e.target.value as ScheduleType)}>
            <NativeSelectOption value="rolling">Rolling — repeat X after last completion</NativeSelectOption>
            <NativeSelectOption value="fixed">Fixed — calendar date (e.g. 1st of month)</NativeSelectOption>
            <NativeSelectOption value="once">One-off</NativeSelectOption>
          </NativeSelect>
        </div>

        {showInterval && (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="interval_value">Every</Label>
              <Input id="interval_value" name="interval_value" type="number" inputMode="numeric" min={1} step={1} defaultValue={task?.interval_value ?? 1} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="interval_unit">Unit</Label>
              <NativeSelect id="interval_unit" name="interval_unit" value={fixedUnit} onChange={(e) => setUnit(e.target.value as IntervalUnit)}>
                {!isFixed && <NativeSelectOption value="day">day(s)</NativeSelectOption>}
                {!isFixed && <NativeSelectOption value="week">week(s)</NativeSelectOption>}
                <NativeSelectOption value="month">month(s)</NativeSelectOption>
                <NativeSelectOption value="year">year(s)</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
        )}

        {isFixed && (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fixed_day_of_month">Day of month</Label>
              <Input id="fixed_day_of_month" name="fixed_day_of_month" type="number" inputMode="numeric" min={1} max={31} defaultValue={task?.fixed_day_of_month ?? 1} required />
            </div>
            {fixedUnit === "year" && (
              <div className="grid gap-1.5">
                <Label htmlFor="fixed_month">Month</Label>
                <NativeSelect id="fixed_month" name="fixed_month" defaultValue={task?.fixed_month ?? 1}>
                  {MONTHS.map((m, i) => (
                    <NativeSelectOption key={m} value={i + 1}>{m}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="start_date">{scheduleType === "once" ? "Due date" : scheduleType === "rolling" ? "Last done / start date" : "Start counting from"}</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={task?.start_date ?? new Date().toISOString().slice(0, 10)} required />
          {scheduleType === "rolling" && (
            <p className="text-xs text-muted-foreground">Until the first completion, next due = this date + interval.</p>
          )}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="estimated_cost">Estimated cost ({CURRENCY}) <span className="text-muted-foreground">optional</span></Label>
        <Input id="estimated_cost" name="estimated_cost" type="number" inputMode="decimal" min={0} step="0.01" defaultValue={task?.estimated_cost ?? ""} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes <span className="text-muted-foreground">optional</span></Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={task?.notes ?? ""} placeholder="Filter size, technician contact, where the valve is…" />
      </div>

      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
