import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";
import { requireSession } from "@/lib/auth";
import { createContact } from "../actions";

export const metadata = { title: "New contact" };

export default async function NewContactPage() {
  const { supabase, householdId } = await requireSession();
  const { data: categories } = await supabase.from("categories").select("id, name, icon").eq("household_id", householdId).order("sort_order");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New contact" />
      <ContactForm action={createContact} categories={categories ?? []} submitLabel="Create contact" />
    </div>
  );
}
