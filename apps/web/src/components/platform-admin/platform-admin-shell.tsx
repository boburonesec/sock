"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const platformAdmin = usePlatformAuthStore((state) => state.platformAdmin);
  const logout = usePlatformAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.replace("/admin/login");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <Link href="/admin/tenants" className="text-lg font-black">
              Paypoq OS Admin
            </Link>
            <p className="text-xs text-muted-foreground">
              SaaS owner panel · {platformAdmin?.email}
            </p>
          </div>
          <nav className="flex items-center gap-3">
            <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin/tenants">
              Tenantlar
            </Link>
            <div className="relative">
              {userMenuOpen && (
                <button
                  aria-label="Admin menyuni yopish"
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setUserMenuOpen(false)}
                />
              )}
              <button
                type="button"
                className="relative z-30 flex h-10 items-center gap-2 rounded-full border bg-card px-2 pl-3 text-sm hover:bg-muted"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="hidden sm:inline">{platformAdmin?.name ?? "Platform admin"}</span>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  PA
                </span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-64 rounded-xl border bg-card p-2 shadow-2xl">
                  <div className="border-b px-3 py-2">
                    <p className="font-medium">{platformAdmin?.name ?? "Platform admin"}</p>
                    <p className="text-xs text-muted-foreground">{platformAdmin?.email}</p>
                  </div>
                  <Link
                    href="/admin/profile"
                    className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserRound size={16} />
                    Profil
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 h-10 w-full justify-start border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    Chiqish
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-8">{children}</section>
    </main>
  );
}
