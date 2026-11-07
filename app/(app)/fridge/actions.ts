"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { FRIDGE_LOCATIONS, FRIDGE_UNITS } from "@/lib/fridge";
import { todayISO } from "@/lib/format";
import type { ActionState, FridgeLocation, FridgeUnit } from "@/lib/types";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

function parseItem(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return { error: "Name is required." } as const;
  const location = str(fd, "location") as FridgeLocation | null;
  if (!location || !FRIDGE_LOCATIONS.some((l) => l.value === location)) return { error: "Pick a location." } as const;
  const unit = str(fd, "unit") as FridgeUnit | null;
  if (!unit || !FRIDGE_UNITS.some((u) => u.value === unit)) return { error: "Pick a unit." } as const;
  const quantity = Number(str(fd, "quantity") ?? "1");
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Quantity must be more than 0." } as const;
  return {
    data: {
      name,
      location,
      quantity,
      unit,
      added_on: str(fd, "added_on") ?? todayISO(),
      expires_on: str(fd, "expires_on"),
      opened_on: str(fd, "opened_on"),
      notes: str(fd, "notes"),
    },
  } as const;
}

function revalidate() {
  revalidatePath("/fridge");
  revalidatePath("/");
}

export async function createFridgeItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  const parsed = parseItem(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.from("fridge_items").insert({ ...parsed.data, household_id: householdId });
  if (error) return { error: error.message };
  revalidate();
  redirect(`/fridge?location=${parsed.data.location}`);
}

export async function updateFridgeItem(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireSession();
  const parsed = parseItem(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.from("fridge_items").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  redirect(`/fridge?location=${parsed.data.location}`);
}

/** Take the item out of the inventory (used up or thrown out). */
export async function removeFridgeItem(id: string, reason: "used" | "discarded") {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("fridge_items").update({ removed_at: new Date().toISOString(), removed_reason: reason }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Put a removed item back (undo). */
export async function restoreFridgeItem(id: string) {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("fridge_items").update({ removed_at: null, removed_reason: null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

/** Decrease quantity by one; reaching 0 marks the item used up. Returns true if it was removed. */
export async function decrementFridgeItem(id: string): Promise<boolean> {
  const { supabase } = await requireSession();
  const { data: item, error } = await supabase.from("fridge_items").select("quantity").eq("id", id).single();
  if (error) throw new Error(error.message);
  const next = Math.max(0, Number(item.quantity) - 1);
  const patch = next === 0
    ? { removed_at: new Date().toISOString(), removed_reason: "used" as const }
    : { quantity: next };
  const { error: upErr } = await supabase.from("fridge_items").update(patch).eq("id", id);
  if (upErr) throw new Error(upErr.message);
  revalidate();
  return next === 0;
}

export async function deleteFridgeItem(id: string) {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("fridge_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
  redirect("/fridge");
}
