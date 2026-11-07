"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getMenuSuggestions, menuFiltersQuery, parseMenuFilters } from "@/lib/menu";
import type { ActionState } from "@/lib/types";

/** Ask the model for fresh ideas even if the inventory hasn't changed. Read-only: never touches fridge_items. */
export async function refreshMenu(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  try {
    await getMenuSuggestions(supabase, householdId, todayISO(), { force: true, filters: parseMenuFilters(fd.getAll("main"), fd.getAll("cuisine")) });
  } catch (e) {
    console.error("[menu] refresh failed:", e);
    return { error: e instanceof Error ? e.message : "Couldn't get new suggestions." };
  }
  revalidatePath("/fridge/cook");
  return { success: "New ideas ready." };
}

/** "Suggest dishes": the only place (with refreshMenu) that calls the model from the web UI. Reuses saved suggestions when they match. */
export async function suggestMenu(fd: FormData) {
  const { supabase, householdId } = await requireSession();
  const filters = parseMenuFilters(fd.getAll("main"), fd.getAll("cuisine"));
  const query = menuFiltersQuery(filters);
  let error: string | null = null;
  try {
    await getMenuSuggestions(supabase, householdId, todayISO(), { filters });
  } catch (e) {
    console.error("[menu] suggest failed:", e);
    error = e instanceof Error ? e.message : "Couldn't get suggestions.";
  }
  const sep = query ? "&" : "?";
  redirect(`/fridge/cook${query}${error ? `${sep}error=${encodeURIComponent(error)}` : ""}`);
}
