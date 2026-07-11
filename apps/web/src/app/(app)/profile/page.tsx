"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Akkaunt va korxonaga kirish ruxsatlari
        </p>
      </div>

      <section className="panel p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Operator</p>
            <h2 className="mt-1 text-xl font-semibold">
              {currentUser?.name ?? "Paypoq OS operatori"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{currentUser?.email}</p>
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

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs uppercase text-muted-foreground">Holat</p>
          <p className="mt-2 font-semibold">{currentUser?.status ?? "Noma’lum"}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase text-muted-foreground">Rollar</p>
          <p className="mt-2 font-semibold">{roles.length ? roles.join(", ") : "Rol yo‘q"}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase text-muted-foreground">Ruxsatlar</p>
          <p className="mt-2 font-semibold">{permissions.length}</p>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-semibold">Korxonaga kirish ruxsatlari</h2>
        <div className="mt-4 grid gap-3">
          {accessibleFactories.map((factory) => (
            <div
              key={factory.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <span className="font-medium">{factory.name}</span>
              {factory.id === activeFactoryId ? (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
                  Tanlangan
                </span>
              ) : null}
            </div>
          ))}
          {accessibleFactories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Korxonaga kirish ruxsati topilmadi.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
