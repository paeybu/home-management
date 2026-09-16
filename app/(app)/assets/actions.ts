"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

function parseAsset(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return { error: "Name is required." } as const;
  return {
    data: {
      name,
      category_id: str(fd, "category_id"),
      brand: str(fd, "brand"),
      model: str(fd, "model"),
      serial: str(fd, "serial"),
      purchased_at: str(fd, "purchased_at"),
      warranty_until: str(fd, "warranty_until"),
      notes: str(fd, "notes"),
    },
  } as const;
}

export async function createAsset(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  const parsed = parseAsset(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { data, error } = await supabase.from("assets").insert({ ...parsed.data, household_id: householdId }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/assets");
  redirect(`/assets/${data.id}`);
}

export async function updateAsset(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireSession();
  const parsed = parseAsset(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.from("assets").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  redirect(`/assets/${id}`);
}

export async function setAssetArchived(id: string, archived: boolean) {
  const { supabase } = await requireSession();
  await supabase.from("assets").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
}
