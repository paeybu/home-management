import { AppNav } from "@/components/app-nav";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSession();
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-24 md:pt-20 md:pb-8">{children}</main>
    </>
  );
}
