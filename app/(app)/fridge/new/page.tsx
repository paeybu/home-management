import { PageHeader } from "@/components/page-header";
import { FridgeForm } from "@/components/fridge-form";
import { FRIDGE_LOCATIONS } from "@/lib/fridge";
import { todayISO } from "@/lib/format";
import type { FridgeLocation } from "@/lib/types";
import { createFridgeItem } from "../actions";

export const metadata = { title: "Add to fridge" };

export default async function NewFridgeItemPage({ searchParams }: PageProps<"/fridge/new">) {
  const sp = await searchParams;
  const location = FRIDGE_LOCATIONS.some((l) => l.value === sp.location) ? (sp.location as FridgeLocation) : "fridge";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add item" />
      <FridgeForm action={createFridgeItem} defaultLocation={location} today={todayISO()} submitLabel="Add item" />
    </div>
  );
}
