"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteFridgeItem } from "@/app/(app)/fridge/actions";

/** Permanently deletes an item (for mistakes). Normal flow is "used up" / "thrown out" from the list. */
export function FridgeDeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => { if (confirm(`Delete "${name}"? This can't be undone.`)) start(() => deleteFridgeItem(id)); }}
    >
      <Trash2 aria-hidden /> Delete
    </Button>
  );
}
