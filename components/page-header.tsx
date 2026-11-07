import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Crumb = { label: string; href: string };

export function PageHeader({ title, description, action, breadcrumb }: { title: string; description?: string; action?: ReactNode; breadcrumb?: Crumb[] }) {
  return (
    <div className="flex flex-col gap-2">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          {/* Mobile: just a back link to the parent. Desktop: the full trail. */}
          <Link href={breadcrumb[breadcrumb.length - 1].href} className="-ml-1 inline-flex items-center gap-0.5 py-1 text-sm text-muted-foreground hover:text-foreground md:hidden">
            <ChevronLeft className="size-4" aria-hidden /> {breadcrumb[breadcrumb.length - 1].label}
          </Link>
          <ol className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            {breadcrumb.map((c) => (
              <li key={c.href} className="flex items-center gap-1">
                <Link href={c.href} className="hover:text-foreground">{c.label}</Link>
                <ChevronRight className="size-3.5" aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="text-foreground">{title}</li>
          </ol>
        </nav>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
