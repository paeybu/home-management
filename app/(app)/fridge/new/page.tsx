import { PageHeader } from "@/components/page-header";
import { FridgeForm, type CatalogSuggestion } from "@/components/fridge-form";
import { requireSession } from "@/lib/auth";
import { FRIDGE_LOCATIONS } from "@/lib/fridge";
import { todayISO } from "@/lib/format";
import type { FridgeLocation } from "@/lib/types";
import { createFridgeItem } from "../actions";

export const metadata = { title: "Add to fridge" };

export default async function NewFridgeItemPage({ searchParams }: PageProps<"/fridge/new">) {
  const sp = await searchParams;
  const { supabase, householdId } = await requireSession();
  const { data: catalog } = await supabase.from("food_catalog").select("id, name, emoji, model, default_unit, default_location, shelf_life_days, use_count").eq("household_id", householdId).order("use_count", { ascending: false }).returns<CatalogSuggestion[]>();
  const location = FRIDGE_LOCATIONS.some((l) => l.value === sp.location) ? (sp.location as FridgeLocation) : "fridge";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add item" breadcrumb={[{ label: "Fridge", href: `/fridge?location=${location}` }]} />
      <FridgeForm action={createFridgeItem} catalog={catalog ?? []} defaultLocation={location} today={todayISO()} submitLabel="Add item" allowAddAnother />
    </div>
  );
}
