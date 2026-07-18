import Link from "next/link";
import { cn } from "@/lib/utils";

interface ModuleNavigationItem {
  href: string;
  label: string;
}

export function ModuleNavigation({
  items,
  className,
}: {
  items: ModuleNavigationItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Bo‘lim sahifalari"
      className={cn(
        "-mx-3 mb-6 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mb-7 sm:flex-wrap sm:px-0",
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/45 hover:bg-muted"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
