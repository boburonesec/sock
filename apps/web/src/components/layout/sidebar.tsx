"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navigationItems } from "@/lib/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const roles = useAuthStore((state) => state.roles);
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!item.ownerOnly) return true;

    return roles.includes("Owner");
  });
  const activeHref = visibleNavigationItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;

  return <>
    {mobileOpen && <button aria-label="Menyuni yopish" onClick={onClose} className="fixed inset-0 z-30 bg-black/55 lg:hidden" />}
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card p-4 transition-transform lg:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="mb-8 flex items-center justify-between px-2">
        <Link href="/dashboard/executive" className="flex items-center gap-3" onClick={onClose}><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground">P</span><span className="text-lg font-bold">Paypoq OS</span></Link>
        <button className="lg:hidden" onClick={onClose}><X /></button>
      </div>
      <nav className="space-y-1">
        {visibleNavigationItems.map(({ href, title, icon: Icon }) => {
          const active = href === activeHref;
          return <Link key={href} href={href} onClick={onClose} className={cn("flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active && "bg-primary/15 text-primary")}><Icon size={19} />{title}</Link>;
        })}
      </nav>
      <div className="mt-auto rounded-xl bg-muted p-3 text-xs text-muted-foreground"><div className="mb-1 font-semibold text-foreground">Paypoq OS</div><div>Fabrika boshqaruvi</div></div>
    </aside>
  </>;
}
