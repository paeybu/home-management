import { AppNav } from "@/components/app-nav";
import { ContactsProvider } from "@/components/contacts-provider";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { supabase, householdId } = await requireSession();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, role, company")
    .eq("household_id", householdId)
    .is("archived_at", null)
    .order("name");
  return (
    <ContactsProvider contacts={contacts ?? []}>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:pt-20 md:pb-8">{children}</main>
    </ContactsProvider>
  );
}
