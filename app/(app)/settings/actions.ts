"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { lineConfigured, linePushText } from "@/lib/line";
import { buildDigest, type DigestTask } from "@/lib/digest";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

export async function createCategory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  const name = str(fd, "name");
  if (!name) return { error: "Name is required." };
  const { count } = await supabase.from("categories").select("*", { count: "exact", head: true }).eq("household_id", householdId);
  const { error } = await supabase.from("categories").insert({ household_id: householdId, name, icon: str(fd, "icon"), sort_order: (count ?? 0) + 1 });
  if (error) return { error: error.code === "23505" ? "A category with that name already exists." : error.message };
  revalidatePath("/settings");
  return { success: "Category added." };
}

export async function updateCategory(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireSession();
  const name = str(fd, "name");
  if (!name) return { error: "Name is required." };
  const { error } = await supabase.from("categories").update({ name, icon: str(fd, "icon") }).eq("id", id);
  if (error) return { error: error.code === "23505" ? "A category with that name already exists." : error.message };
  revalidatePath("/settings");
  return { success: "Category updated." };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const { supabase } = await requireSession();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/tasks");
  return { success: "Category deleted. Linked tasks and assets are now uncategorised." };
}

export async function sendLineTest(): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  if (!lineConfigured()) return { error: "LINE is not configured. Set LINE_CHANNEL_ACCESS_TOKEN and LINE_GROUP_ID." };
  const { data: rows } = await supabase
    .from("task_due")
    .select("title, due_on, days_until_due, categories(name, icon)")
    .eq("household_id", householdId)
    .not("due_on", "is", null)
    .lte("days_until_due", 3)
    .order("due_on");
  const tasks: DigestTask[] = (rows ?? []).map((r) => {
    const cat = r.categories as unknown as { name: string; icon: string | null } | null;
    return { title: r.title, due_on: r.due_on!, days_until_due: r.days_until_due!, category: cat?.name ?? null, icon: cat?.icon ?? null };
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const text = buildDigest(tasks, appUrl) ?? `🏠 Home tasks\n\nTest message — nothing overdue or due in the next 3 days.\n${appUrl}`;
  try {
    await linePushText(text);
    return { success: "Sent to LINE group." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "LINE send failed." };
  }
}
