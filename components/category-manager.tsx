"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { createCategory, deleteCategory, updateCategory } from "@/app/(app)/settings/actions";
import type { ActionState, Category } from "@/lib/types";

function withToast(
  fn: (prev: ActionState, fd: FormData) => Promise<ActionState>,
  onSuccess?: () => void,
) {
  return async (prev: ActionState, fd: FormData) => {
    const r = await fn(prev, fd);
    if (r?.success) { toast.success(r.success); onSuccess?.(); }
    if (r?.error) toast.error(r.error);
    return r;
  };
}

function CategoryRow({ category }: { category: Category }) {
  const [editing, setEditing] = useState(false);
  const [, action] = useActionState<ActionState, FormData>(
    withToast(updateCategory.bind(null, category.id), () => setEditing(false)),
    undefined,
  );
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <li className="py-2">
        <form action={action} className="flex items-center gap-2">
          <Input name="icon" defaultValue={category.icon ?? ""} aria-label="Icon" className="w-14 text-center" maxLength={4} />
          <Input name="name" defaultValue={category.name} aria-label="Name" required className="flex-1" />
          <SubmitButton size="icon-sm" variant="default" aria-label="Save"><Check aria-hidden /></SubmitButton>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditing(false)}><X aria-hidden /></Button>
        </form>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-2 py-2">
      <span aria-hidden className="w-8 text-center text-lg">{category.icon ?? "•"}</span>
      <span className="flex-1 text-sm">{category.name}</span>
      <Button size="icon-sm" variant="ghost" aria-label={`Edit ${category.name}`} onClick={() => setEditing(true)}><Pencil aria-hidden /></Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={`Delete ${category.name}`}
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete "${category.name}"? Tasks and assets in it become uncategorised.`)) return;
          start(async () => {
            const r = await deleteCategory(category.id);
            if (r?.error) toast.error(r.error); else toast.success("Category deleted");
          });
        }}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState<ActionState, FormData>(withToast(createCategory), undefined);
  return (
    <div className="grid gap-3">
      <ul className="divide-y">
        {categories.map((c) => <CategoryRow key={c.id} category={c} />)}
      </ul>
      <form key={state?.success} action={action} className="flex items-center gap-2">
        <Input name="icon" placeholder="🔧" aria-label="Icon" className="w-14 text-center" maxLength={4} />
        <Input name="name" placeholder="New category" aria-label="Name" required className="flex-1" />
        <SubmitButton size="sm" variant="outline"><Plus aria-hidden /> Add</SubmitButton>
      </form>
    </div>
  );
}
