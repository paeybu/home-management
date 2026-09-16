import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AssetForm } from "@/components/asset-form";
import { requireSession } from "@/lib/auth";
import type { Asset } from "@/lib/types";
import { updateAsset } from "../../actions";

export const metadata = { title: "Edit asset" };

export default async function EditAssetPage({ params }: PageProps<"/assets/[id]/edit">) {
  const { id } = await params;
  const { supabase, householdId } = await requireSession();
  const [{ data: asset }, { data: categories }] = await Promise.all([
    supabase.from("assets").select("*").eq("id", id).maybeSingle<Asset>(),
    supabase.from("categories").select("id, name, icon").eq("household_id", householdId).order("sort_order"),
  ]);
  if (!asset) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit asset" description={asset.name} />
      <AssetForm action={updateAsset.bind(null, asset.id)} categories={categories ?? []} asset={asset} />
    </div>
  );
}
