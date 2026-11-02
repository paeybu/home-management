import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "@/components/contact-form";
import { requireSession } from "@/lib/auth";
import type { Contact } from "@/lib/types";
import { updateContact } from "../../actions";

export const metadata = { title: "Edit contact" };

export default async function EditContactPage({ params }: PageProps<"/contacts/[id]/edit">) {
  const { id } = await params;
  const { supabase, householdId } = await requireSession();
  const [{ data: contact }, { data: categories }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle<Contact>(),
    supabase.from("categories").select("id, name, icon").eq("household_id", householdId).order("sort_order"),
  ]);
  if (!contact) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit contact" description={contact.name} />
      <ContactForm action={updateContact.bind(null, contact.id)} categories={categories ?? []} contact={contact} />
    </div>
  );
}
