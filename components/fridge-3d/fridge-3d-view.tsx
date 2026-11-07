"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FridgeItemRow } from "@/components/fridge-item-row";
import type { DoorId, Item3D } from "./fridge-scene";

// three.js needs the browser (WebGL), and this keeps it out of every other page's bundle.
const FridgeScene = dynamic(() => import("./fridge-scene").then((m) => m.FridgeScene), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-xl" />,
});

const ALL_CLOSED: Record<DoorId, boolean> = { fridgeL: false, fridgeR: false, freezerL: false, freezerR: false };

export type Fridge3DItem = Item3D & { opened_on: string | null };

export function Fridge3DView({ items, today }: { items: Fridge3DItem[]; today: string }) {
  const [open, setOpen] = useState(ALL_CLOSED);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.id === selectedId);

  // Swing the fridge doors open shortly after the page loads.
  useEffect(() => {
    const t = setTimeout(() => setOpen((o) => ({ ...o, fridgeL: true, fridgeR: true })), 600);
    return () => clearTimeout(t);
  }, []);

  const toggle = useCallback((id: DoorId) => setOpen((o) => ({ ...o, [id]: !o[id] })), []);
  const anyOpen = Object.values(open).some(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[62svh] min-h-80 overflow-hidden rounded-xl border bg-[#eef1f4]">
        <FridgeScene items={items} today={today} selectedId={selectedId} onSelect={setSelectedId} open={open} onToggleDoor={toggle} />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <p className="rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
            Tap a door to open · tap food for details · drag to look around
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="pointer-events-auto"
            onClick={() => setOpen(anyOpen ? ALL_CLOSED : { fridgeL: true, fridgeR: true, freezerL: true, freezerR: true })}
          >
            {anyOpen ? "Close all" : "Open all"}
          </Button>
        </div>
      </div>

      {selected ? (
        <div className="flex items-center gap-3 rounded-xl border px-3">
          <span aria-hidden className="text-2xl">{selected.emoji}</span>
          <ul className="min-w-0 flex-1">
            <FridgeItemRow item={selected} today={today} />
          </ul>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          {items.length ? `${items.length} item${items.length === 1 ? "" : "s"} · red ring = expired, amber = expiring soon` : "Nothing tracked yet. Tap Add to start."}
        </p>
      )}
    </div>
  );
}
