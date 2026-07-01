"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
            <Button variant="outline" onClick={handleLogout}>
              Chiqish
            </Button>
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-8">{children}</section>
    </main>
  );
}
