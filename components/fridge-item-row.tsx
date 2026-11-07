"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Check, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { decrementFridgeItem, removeFridgeItem, restoreFridgeItem } from "@/app/(app)/fridge/actions";
import { expiryStatus, formatQuantity, relativeExpiry } from "@/lib/fridge";
import type { FridgeItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = Pick<FridgeItem, "id" | "name" | "quantity" | "unit" | "expires_on" | "opened_on">;

export function FridgeItemRow({ item, today }: { item: Row; today: string }) {
  const [pending, start] = useTransition();
  const { status, days } = expiryStatus(item.expires_on, today);
  const countable = item.unit === "pcs" || item.unit === "pack";

  const undo = () => start(async () => { await restoreFridgeItem(item.id); toast.success(`${item.name} restored`); });
  const remove = (reason: "used" | "discarded") =>
    start(async () => {
      try {
        await removeFridgeItem(item.id, reason);
        toast.success(`${item.name} ${reason === "used" ? "used up" : "thrown out"}`, { action: { label: "Undo", onClick: undo } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  const decrement = () =>
    start(async () => {
      try {
        const removed = await decrementFridgeItem(item.id);
        if (removed) toast.success(`${item.name} used up`, { action: { label: "Undo", onClick: undo } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong");
      }
    });

  return (
    <li className={cn("flex items-center gap-2 py-3", pending && "opacity-60")}>
      <Link href={`/fridge/${item.id}/edit`} className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatQuantity(item.quantity, item.unit)}</span>
          <span aria-hidden>·</span>
          <span
            className={cn(
              status === "expired" && "font-medium text-red-700 dark:text-red-300",
              status === "expiring_soon" && "font-medium text-amber-700 dark:text-amber-300",
            )}
          >
            {relativeExpiry(days)}
          </span>
          {item.opened_on && (<><span aria-hidden>·</span><span>Opened</span></>)}
        </p>
      </Link>
      {countable && (
        <Button variant="outline" size="icon" disabled={pending} onClick={decrement} aria-label={`Use one ${item.name}`}>
          <Minus aria-hidden />
        </Button>
      )}
      <Button variant="outline" size="icon" disabled={pending} onClick={() => remove("used")} aria-label={`${item.name} used up`}>
        <Check aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" disabled={pending} onClick={() => remove("discarded")} aria-label={`Throw out ${item.name}`}>
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
