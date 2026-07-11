"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getDefaultHomePath,
  resolveRouteAccess,
} from "@/lib/access-control";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Blocks unauthorized URL navigation (sidebar hide is not enough).
 * Children are not mounted when access is denied — no domain API hooks fire.
 */
export function PermissionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const decision = resolveRouteAccess(pathname, permissions, roles);

  if (decision.allowed) {
    return <>{children}</>;
  }

  const homePath = getDefaultHomePath(permissions);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200">
        403 · Ruxsat yo‘q
      </p>
      <h1 className="text-2xl font-bold">Bu sahifaga kira olmaysiz</h1>
      <p className="text-sm text-muted-foreground">{decision.reason}</p>
      {decision.requiredPermissions.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Kerakli ruxsat:{" "}
          <span className="font-mono text-foreground/80">
            {decision.requiredPermissions.join(", ")}
          </span>
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        URL ni qo‘lda yozsangiz ham, ruxsatsiz sahifa ochilmaydi va ma’lumot
        so‘rovlari yuborilmaydi.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href={homePath}>
          <Button type="button">Asosiy sahifaga qaytish</Button>
        </Link>
        <Link href="/profile">
          <Button type="button" variant="outline">
            Profil
          </Button>
        </Link>
      </div>
    </div>
  );
}
