"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import type { ActionState } from "@/lib/types";
import { formatPhone } from "@/lib/contacts";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};

function parseContact(fd: FormData) {
  const name = str(fd, "name");
  if (!name) return { error: "Name is required." } as const;
  const rawPhone = str(fd, "phone");
  if (rawPhone && rawPhone.replace(/\D/g, "").length !== 10) return { error: "Phone must be 10 digits (xxx-xxx-xxxx)." } as const;
  const email = str(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email looks invalid." } as const;
  return {
    data: {
      name,
      company: str(fd, "company"),
      role: str(fd, "role"),
      category_id: str(fd, "category_id"),
      phone: rawPhone ? formatPhone(rawPhone) : null,
      email: email?.toLowerCase() ?? null,
      line_id: str(fd, "line_id")?.replace(/^@?~?/, "") ?? null,
      notes: str(fd, "notes"),
    },
  } as const;
}

export async function createContact(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, householdId } = await requireSession();
  const parsed = parseContact(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { data, error } = await supabase.from("contacts").insert({ ...parsed.data, household_id: householdId }).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/contacts");
  redirect(`/contacts/${data.id}`);
}

export async function updateContact(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireSession();
  const parsed = parseContact(fd);
  if ("error" in parsed) return { error: parsed.error };
  const { error } = await supabase.from("contacts").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

export async function setContactArchived(id: string, archived: boolean) {
  const { supabase } = await requireSession();
  await supabase.from("contacts").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
}
