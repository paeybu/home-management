"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Contact, Home, ListChecks, Package, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/assets", label: "Assets", icon: Package },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80 md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around md:justify-start md:gap-1 md:px-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors md:flex-row md:gap-2 md:px-3 md:py-3 md:text-sm",
                  active && "text-primary",
                )}
              >
                <Icon className="size-5 md:size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
