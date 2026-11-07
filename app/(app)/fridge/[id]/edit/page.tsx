import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FridgeForm } from "@/components/fridge-form";
import { FridgeDeleteButton } from "@/components/fridge-delete-button";
import { requireSession } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import type { FridgeItem } from "@/lib/types";
import { updateFridgeItem } from "../../actions";

export const metadata = { title: "Edit item" };

export default async function EditFridgeItemPage({ params }: PageProps<"/fridge/[id]/edit">) {
  const { id } = await params;
  const { supabase } = await requireSession();
  const { data: item } = await supabase.from("fridge_items").select("*").eq("id", id).maybeSingle<FridgeItem>();
  if (!item) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit item" description={item.name} action={<FridgeDeleteButton id={item.id} name={item.name} />} />
      <FridgeForm action={updateFridgeItem.bind(null, item.id)} item={item} today={todayISO()} />
    </div>
  );
}
