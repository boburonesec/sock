"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bo‘lim sahifalari"
      className={cn(
        "-mx-3 mb-6 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mb-7 sm:flex-wrap sm:px-0",
        className,
      )}
    >
      {items.map((item) => {
        // Robust prefix matching:
        // If href is "/sales", it only matches exactly "/sales" or "/sales" with no subpaths other than what's matched?
        // Wait, if item is "/sales", we don't want it to match "/sales/orders".
        // If item is "/sales/orders", it should match "/sales/orders" and "/sales/orders/123".
        const isActive =
          item.href === pathname ||
          (pathname.startsWith(item.href + "/") && item.href !== "/sales" && item.href !== "/finance" && item.href !== "/warehouse");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-11 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground hover:border-primary/45 hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
