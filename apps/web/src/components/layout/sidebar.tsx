"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getDefaultHomePath } from "@/lib/access-control";
import { navigationItems } from "@/lib/navigation";
import { isPilotPathVisible } from "@/lib/pilot-scope";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";

const sectionLabels: Record<(typeof navigationItems)[number]["section"], string> = {
  monitoring: "Kuzatuv",
  work: "Kundalik ish",
  system: "Tizim",
};

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const setActiveFactory = useAuthStore((state) => state.setActiveFactory);
  const homePath = getDefaultHomePath(permissions, roles);
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!isPilotPathVisible(item.href, roles)) {
      return false;
    }

    if (item.ownerOnly && !roles.includes("Owner")) {
      return false;
    }

    if (!item.requiredPermissions?.length) {
      return true;
    }

    return item.requiredPermissions.every((permission) => permissions.includes(permission));
  });
  const activeHref = visibleNavigationItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;
  const sections = (["monitoring", "work", "system"] as const)
    .map((section) => ({
      section,
      items: visibleNavigationItems.filter((item) => item.section === section),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Menyuni yopish"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(18rem,100vw-2.5rem)] flex-col border-r bg-card p-4 transition-transform duration-200 ease-out lg:w-64 lg:translate-x-0",
          "pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <Link
            href={homePath}
            className="flex min-w-0 items-center gap-3"
            onClick={onClose}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground">
              P
            </span>
            <span className="truncate text-lg font-bold">Paypoq OS</span>
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted lg:hidden"
            aria-label="Menyuni yopish"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
          {sections.map(({ section, items }) => (
            <div key={section} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {sectionLabels[section]}
              </p>
              {items.map(({ href, title, icon: Icon }) => {
                const active = href === activeHref;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      active && "bg-primary/15 text-primary",
                    )}
                  >
                    <Icon size={19} className="shrink-0" />
                    <span className="truncate">{title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-4 space-y-2 rounded-xl bg-muted/70 p-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>Paypoq OS</span>
            {accessibleFactories.length > 0 && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {accessibleFactories.find((f) => f.id === activeFactoryId)?.name ?? "Asosiy"}
              </span>
            )}
          </div>
          {accessibleFactories.length > 1 ? (
            <div className="pt-1">
              <label htmlFor="mobile-factory-select" className="mb-1 block text-[11px] text-muted-foreground">
                Filialni almashtirish
              </label>
              <select
                id="mobile-factory-select"
                aria-label="Filial tanlash"
                className="h-10 w-full rounded-lg border bg-background px-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                value={activeFactoryId ?? ""}
                onChange={async (event) => {
                  setActiveFactory(event.target.value);
                  await queryClient.invalidateQueries();
                }}
              >
                {accessibleFactories.map((factory) => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>Mobil brauzerda to‘liq moslashtirilgan</div>
          )}
        </div>
      </aside>
    </>
  );
}
