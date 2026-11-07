import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { CategoryManager } from "@/components/category-manager";
import { LineTestButton } from "@/components/line-test-button";
import { PropertyNameForm } from "@/components/property-name-form";
import { requireSession } from "@/lib/auth";
import { lineConfigured } from "@/lib/line";
import { formatDate } from "@/lib/format";
import type { Category } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, householdId, email, role } = await requireSession();
  const [{ data: household }, { data: categories }, { data: allowed }, { data: lastReminder }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).single(),
    supabase.from("categories").select("*").eq("household_id", householdId).order("sort_order").returns<Category[]>(),
    supabase.from("allowed_emails").select("email").eq("household_id", householdId).order("email"),
    supabase.from("reminder_log").select("sent_on, task_count").eq("household_id", householdId).order("sent_on", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description={household?.name} />

      <Card>
        <CardHeader>
          <CardTitle>Property</CardTitle>
          <CardDescription>
            {role === "owner" ? "Shown at the top of the home page." : "Only the owner can rename the property."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyNameForm name={household?.name ?? ""} canEdit={role === "owner"} />
        </CardContent>
      </Card>

      <Link href="/payments" className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted">
        <Receipt className="size-4 text-muted-foreground" aria-hidden />
        <span className="flex-1">Payments</span>
        <span className="text-xs font-normal text-muted-foreground">Costs by category and year</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Used to group tasks, assets and payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryManager categories={categories ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LINE reminders</CardTitle>
          <CardDescription>
            A digest of overdue and due-in-3-days tasks, plus fridge items about to expire, is pushed to your LINE group every morning. Type <code>/task</code> or <code>/fridge</code> in the group to get the full list.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p>
            Status:{" "}
            {lineConfigured() ? (
              <span className="font-medium text-emerald-700 dark:text-emerald-300">configured</span>
            ) : (
              <span className="font-medium text-amber-700 dark:text-amber-300">not configured</span>
            )}
            {lastReminder && (
              <span className="text-muted-foreground"> · last sent {formatDate(lastReminder.sent_on)} ({lastReminder.task_count} tasks)</span>
            )}
          </p>
          {!lineConfigured() && (
            <p className="text-muted-foreground">
              Set <code>LINE_CHANNEL_ACCESS_TOKEN</code> and <code>LINE_GROUP_ID</code> in Vercel environment variables, then redeploy.
            </p>
          )}
          <LineTestButton disabled={!lineConfigured()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {email} ({role}).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div>
            <p className="mb-1 text-muted-foreground">Allowed sign-in emails</p>
            <ul className="list-inside list-disc">
              {(allowed ?? []).map((a) => <li key={a.email}>{a.email}</li>)}
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">Add rows to <code>allowed_emails</code> in Supabase to let another Google account in.</p>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
