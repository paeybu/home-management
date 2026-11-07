import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FridgeForm, type CatalogSuggestion } from "@/components/fridge-form";
import { FridgeDeleteButton } from "@/components/fridge-delete-button";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import type { FridgeItem } from "@/lib/types";
import { updateFridgeItem } from "../../actions";

export const metadata = { title: "Edit item" };

export default async function EditFridgeItemPage({ params }: PageProps<"/fridge/[id]/edit">) {
  const { id } = await params;
  const { supabase, householdId } = await requireSession();
  const [{ data: item }, { data: catalog }] = await Promise.all([
    supabase.from("fridge_items").select("*").eq("id", id).maybeSingle<FridgeItem>(),
    supabase.from("food_catalog").select("id, name, emoji, model, default_unit, default_location, shelf_life_days, use_count").eq("household_id", householdId).order("use_count", { ascending: false }).returns<CatalogSuggestion[]>(),
  ]);
  if (!item) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit item" description={item.name} breadcrumb={[{ label: "Fridge", href: `/fridge?location=${item.location}` }]} action={<FridgeDeleteButton id={item.id} name={item.name} />} />
      <FridgeForm action={updateFridgeItem.bind(null, item.id)} item={item} catalog={catalog ?? []} today={todayISO()} />
    </div>
  );
}
