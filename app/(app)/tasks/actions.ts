"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import type { ActionState, IntervalUnit, ScheduleType } from "@/lib/types";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function parseTask(fd: FormData) {
  const title = str(fd, "title");
  if (!title) return { error: "Title is required." } as const;
  const schedule_type = (str(fd, "schedule_type") ?? "rolling") as ScheduleType;
  if (!["rolling", "fixed", "once"].includes(schedule_type)) return { error: "Invalid schedule." } as const;

  const estimated_cost = num(fd, "estimated_cost");
  if (Number.isNaN(estimated_cost) || (estimated_cost !== null && estimated_cost < 0)) return { error: "Estimated cost must be a positive number." } as const;

  const start_date = str(fd, "start_date") ?? new Date().toISOString().slice(0, 10);

  let interval_value: number | null = null;
  let interval_unit: IntervalUnit | null = null;
  let fixed_day_of_month: number | null = null;
  let fixed_month: number | null = null;

  if (schedule_type !== "once") {
    interval_value = num(fd, "interval_value");
    interval_unit = str(fd, "interval_unit") as IntervalUnit | null;
    if (!interval_value || Number.isNaN(interval_value) || interval_value < 1) return { error: "Interval must be at least 1." } as const;
    if (!interval_unit || !["day", "week", "month", "year"].includes(interval_unit)) return { error: "Choose an interval unit." } as const;
  }
  if (schedule_type === "fixed") {
    if (interval_unit !== "month" && interval_unit !== "year") return { error: "Fixed schedules repeat monthly or yearly." } as const;
    fixed_day_of_month = num(fd, "fixed_day_of_month");
    if (!fixed_day_of_month || Number.isNaN(fixed_day_of_month) || fixed_day_of_month < 1 || fixed_day_of_month > 31) return { error: "Day of month must be 1–31." } as const;
    if (interval_unit === "year") {
      fixed_month = num(fd, "fixed_month");
      if (!fixed_month || Number.isNaN(fixed_month) || fixed_month < 1 || fixed_month > 12) return { error: "Choose a month." } as const;
    }
  }

  return {
    data: {
      title,
      notes: str(fd, "notes"),
      category_id: str(fd, "category_id"),
      asset_id: str(fd, "asset_id"),
      schedule_type,
      interval_value: Math.trunc(interval_value ?? 0) || null,
      interval_unit,
      fixed_day_of_month,
      fixed_month,
      start_date,
      estimated_cost,
    },
  } as const;
}

export async function createTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  const parsed = parseTask(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, household_id: householdId })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/tasks");
  redirect(`/tasks/${data.id}`);
}

export async function updateTask(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireSession();
  const parsed = parseTask(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.from("tasks").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  redirect(`/tasks/${id}`);
}

export async function markDone(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId, userId } = await requireSession();
  const task_id = str(fd, "task_id");
  if (!task_id) return { error: "Missing task." };

  const cost = num(fd, "cost");
  if (Number.isNaN(cost) || (cost !== null && cost < 0)) return { error: "Cost must be a positive number." };

  const completed_on = str(fd, "completed_on");
  // Keep the wall-clock time of "now" but on the chosen date, so ordering within a day is preserved.
  const completed_at = completed_on
    ? new Date(`${completed_on}T${new Date().toISOString().slice(11)}`).toISOString()
    : new Date().toISOString();

  let photo_path: string | null = null;
  const photo = fd.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "Photo must be an image." };
    if (photo.size > 10 * 1024 * 1024) return { error: "Photo must be under 10 MB." };
    const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
    photo_path = `${householdId}/${task_id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("completions")
      .upload(photo_path, photo, { contentType: photo.type, upsert: false });
    if (upErr) return { error: `Photo upload failed: ${upErr.message}` };
  }

  const { error } = await supabase.from("task_completions").insert({
    task_id,
    household_id: householdId,
    completed_by: userId,
    completed_at,
    cost,
    notes: str(fd, "notes"),
    photo_path,
  });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task_id}`);
  revalidatePath("/payments");
  return { success: "Marked done." };
}

export async function deleteCompletion(id: string, taskId: string) {
  const { supabase } = await requireSession();
  const { data } = await supabase.from("task_completions").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("task_completions").delete().eq("id", id);
  if (!error && data?.photo_path) await supabase.storage.from("completions").remove([data.photo_path]);
  revalidatePath("/");
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/payments");
}

export async function setTaskPaused(id: string, paused: boolean) {
  const { supabase } = await requireSession();
  await supabase.from("tasks").update({ paused_at: paused ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}

export async function setTaskArchived(id: string, archived: boolean) {
  const { supabase } = await requireSession();
  await supabase.from("tasks").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
}
