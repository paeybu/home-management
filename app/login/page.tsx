import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

async function signInWithGoogle() {
  "use server";
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

const ERRORS: Record<string, string> = {
  not_allowed: "This Google account isn't on the allowlist for this household.",
  oauth: "Google sign-in failed. Please try again.",
  callback: "Sign-in could not be completed. Please try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary text-2xl">🏠</div>
          <CardTitle className="text-xl">Home Management</CardTitle>
          <CardDescription>Sign in with the Google account for your household.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {message && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          )}
          <form action={signInWithGoogle}>
            <Button type="submit" className="w-full" size="lg">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
