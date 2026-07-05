"use client";

import { useRouter } from "next/navigation";
import { PlatformAdminGate } from "@/components/platform-admin/platform-admin-gate";
import { PlatformAdminShell } from "@/components/platform-admin/platform-admin-shell";
import { Button } from "@/components/ui/button";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

export default function PlatformAdminProfilePage() {
  const router = useRouter();
  const platformAdmin = usePlatformAuthStore((state) => state.platformAdmin);
  const logout = usePlatformAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.replace("/admin/login");
  }

  return (
    <PlatformAdminGate>
      <PlatformAdminShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Admin profili</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Korxonalarni ochish va boshqarish accounti
            </p>
          </div>

          <section className="panel p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Admin</p>
                <h2 className="mt-1 text-xl font-semibold">
                  {platformAdmin?.name ?? "Admin"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{platformAdmin?.email}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                onClick={handleLogout}
              >
                Chiqish
              </Button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="panel p-5">
              <p className="text-xs uppercase text-muted-foreground">Holat</p>
              <p className="mt-2 font-semibold">
                {platformAdmin?.status === "ACTIVE" ? "Faol" : platformAdmin?.status ?? "Noma’lum"}
              </p>
            </div>
            <div className="panel p-5">
              <p className="text-xs uppercase text-muted-foreground">Ruxsat turi</p>
              <p className="mt-2 font-semibold">Korxona ochish va sozlash</p>
            </div>
          </section>
        </div>
      </PlatformAdminShell>
    </PlatformAdminGate>
  );
}
