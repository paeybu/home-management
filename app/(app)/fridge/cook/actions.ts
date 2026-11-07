"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getMenuSuggestions } from "@/lib/menu";
import type { ActionState } from "@/lib/types";

/** Ask the model for fresh ideas even if the inventory hasn't changed. Read-only: never touches fridge_items. */
export async function refreshMenu(_prev: ActionState): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  try {
    await getMenuSuggestions(supabase, householdId, todayISO(), { force: true });
  } catch (e) {
    console.error("[menu] refresh failed:", e);
    return { error: e instanceof Error ? e.message : "Couldn't get new suggestions." };
  }
  revalidatePath("/fridge/cook");
  return { success: "New ideas ready." };
}
