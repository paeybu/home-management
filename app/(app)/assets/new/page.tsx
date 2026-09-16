import { PageHeader } from "@/components/page-header";
import { AssetForm } from "@/components/asset-form";
import { requireSession } from "@/lib/auth";
import { createAsset } from "../actions";

export const metadata = { title: "New asset" };

export default async function NewAssetPage() {
  const { supabase, householdId } = await requireSession();
  const { data: categories } = await supabase.from("categories").select("id, name, icon").eq("household_id", householdId).order("sort_order");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New asset" />
      <AssetForm action={createAsset} categories={categories ?? []} submitLabel="Create asset" />
    </div>
  );
}
