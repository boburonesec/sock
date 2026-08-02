"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { telegramApi } from "@/lib/api/telegram";
import { entityStatusLabel, formatRoleName, labelStatus } from "@/lib/status-labels";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const roles = useAuthStore((state) => state.roles);
  const permissions = useAuthStore((state) => state.permissions);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const setActiveFactory = useAuthStore((state) => state.setActiveFactory);
  const logout = useAuthStore((state) => state.logout);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const telegramLink = useMutation({ mutationFn: telegramApi.createMyUserLinkToken, onSuccess: (response) => setTelegramCode(response.data.code) });

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Profil</h1>
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
            className="w-full border-rose-500/30 text-rose-300 hover:bg-rose-500/10 sm:w-auto"
            onClick={handleLogout}
          >
            Chiqish
          </Button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs uppercase text-muted-foreground">Holat</p>
          <p className="mt-2 font-semibold">
            {labelStatus(entityStatusLabel, currentUser?.status)}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase text-muted-foreground">Rollar</p>
          <p className="mt-2 font-semibold">
            {roles.length ? roles.map(formatRoleName).join(", ") : "Rol yo‘q"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs uppercase text-muted-foreground">Ruxsatlar</p>
          <p className="mt-2 font-semibold">{permissions.length}</p>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="font-semibold">Telegram bildirishnomalari</h2>
        <p className="mt-1 text-sm text-muted-foreground">Vazifa va qayta tekshiruv xabarlarini olish uchun dastur hisobingizni botga ulang.</p>
        {telegramCode ? <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 font-mono text-lg">/link {telegramCode}</p> : <Button className="mt-3" variant="outline" onClick={() => telegramLink.mutate()}>Ulanish kodini olish</Button>}
      </section>

      <section className="panel p-5">
        <h2 className="font-semibold">Korxonaga kirish ruxsatlari</h2>
        <div className="mt-4 grid gap-3">
          {accessibleFactories.map((factory) => (
            <button
              key={factory.id}
              type="button"
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:border-primary/40"
              onClick={async () => {
                if (factory.id === activeFactoryId) return;
                setActiveFactory(factory.id);
                await queryClient.invalidateQueries();
              }}
            >
              <span className="font-medium">{factory.name}</span>
              {factory.id === activeFactoryId ? (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary">
                  Tanlangan
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Tanlash</span>
              )}
            </button>
          ))}
          {accessibleFactories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Korxonaga kirish ruxsati topilmadi.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
