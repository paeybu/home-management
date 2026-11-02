import Link from "next/link";
import Form from "next/form";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { ContactChannels } from "@/components/contact-actions";
import { requireSession } from "@/lib/auth";
import { matchesContact } from "@/lib/contacts";
import type { Contact } from "@/lib/types";

export const metadata = { title: "Contacts" };

type Row = Contact & { categories: { name: string; icon: string | null } | null; tasks: { count: number }[] };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const q = typeof sp.q === "string" ? sp.q : "";
  const { supabase, householdId } = await requireSession();
  let query = supabase.from("contacts").select("*, categories(name, icon), tasks(count)").eq("household_id", householdId).order("name");
  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  const { data } = await query.returns<Row[]>();
  const rows = (data ?? []).filter((c) => matchesContact(c, q));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Contacts"
        action={<Button render={<Link href="/contacts/new" />} size="sm"><Plus aria-hidden /> New</Button>}
      />
      <Form action="/contacts" className="relative">
        {showArchived && <input type="hidden" name="archived" value="1" />}
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" name="q" defaultValue={q} placeholder="Search name, role, phone…" aria-label="Search contacts" className="pl-8" />
      </Form>
      <div className="flex gap-2 text-sm">
        <Link href={`/contacts${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={!showArchived ? "font-medium" : "text-muted-foreground"}>Active</Link>
        <span aria-hidden className="text-muted-foreground">·</span>
        <Link href={`/contacts?archived=1${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={showArchived ? "font-medium" : "text-muted-foreground"}>Archived</Link>
      </div>
      {!rows.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {q ? `No contacts match “${q}”.` : showArchived ? "No archived contacts." : "No contacts yet. Add your gardener, AC technician, maid…"}
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((c) => {
            const taskCount = c.tasks?.[0]?.count ?? 0;
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <Link href={`/contacts/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {c.categories?.icon ?? c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[c.role, c.company].filter(Boolean).join(" · ") || c.categories?.name || c.phone || "—"}
                      {taskCount ? ` · ${taskCount} task${taskCount === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0"><ContactChannels contact={c} compact /></div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
