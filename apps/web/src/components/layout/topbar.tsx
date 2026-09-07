"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Drawer, DrawerFooter } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/auth-store";

function formatStatus(status?: string): string {
  if (status === "ACTIVE") return "Faol";
  if (status === "SUSPENDED") return "To‘xtatilgan";
  return status ?? "Noma’lum";
}

function formatRole(role: string): string {
  const labels: Record<string, string> = {
    Owner: "Korxona egasi",
    Manager: "Menejer",
    Accountant: "Buxgalter",
    Seller: "Sotuvchi",
    "Warehouse Operator": "Omborchi",
    "Shift Receiver": "Smena qabul qiluvchi",
    Mechanic: "Mexanik",
    "Mechanic Master": "Mexanik-master",
  };

  return labels[role] ?? role;
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "" });
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const currentUser = useAuthStore((state) => state.currentUser);
  const roles = useAuthStore((state) => state.roles);
  const accessibleFactories = useAuthStore((state) => state.accessibleFactories);
  const activeFactoryId = useAuthStore((state) => state.activeFactoryId);
  const setActiveFactory = useAuthStore((state) => state.setActiveFactory);
  const logout = useAuthStore((state) => state.logout);
  const initials = currentUser?.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "PO";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser || passwordForm.currentPassword.trim().length === 0 || passwordForm.password.trim().length < 8) {
      return;
    }

    setPasswordStatus("saving");
    try {
      await authApi.changeUserPassword(currentUser.id, {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.password,
      });
      setPasswordForm({ currentPassword: "", password: "" });
      setPasswordStatus("success");
    } catch {
      setPasswordStatus("error");
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-background/90 px-3 backdrop-blur safe-pt sm:h-16 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-muted lg:hidden"
          aria-label="Menyuni ochish"
          onClick={onMenuClick}
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Paypoq OS</p>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            Fabrika boshqaruvi
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {accessibleFactories.length > 1 ? (
          <select
            className="hidden h-10 max-w-[10rem] rounded-lg border bg-background px-2 text-xs sm:block md:max-w-[14rem] md:text-sm"
            aria-label="Filial tanlash"
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
        ) : null}
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-lg hover:bg-muted"
          aria-label="Mavzuni almashtirish"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-lg hover:bg-muted"
          aria-label="Bildirishnomalar"
          onClick={() => router.push("/notifications")}
        >
          <Bell size={18} />
        </button>
        <div>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
            aria-label="Akkaunt oynasini ochish"
            onClick={() => {
              setAccountOpen(true);
              setPasswordStatus("idle");
            }}
          >
            {initials}
          </button>
          <Drawer
            open={accountOpen}
            onOpenChange={(open) => {
              setAccountOpen(open);
              if (!open) {
                setPasswordForm({ currentPassword: "", password: "" });
                setPasswordStatus("idle");
              }
            }}
            title="Akkaunt"
            description="Operator ma’lumotlari va parol sozlamalari"
          >
            <div className="space-y-5">
              <section className="rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {initials}
                  </span>
                  <div>
                    <p className="font-semibold">{currentUser?.name ?? "Paypoq OS"}</p>
                    <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Holat</p>
                    <p className="font-medium">{formatStatus(currentUser?.status)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rol</p>
                    <p className="font-medium">{roles.length ? roles.map(formatRole).join(", ") : "Belgilanmagan"}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">Filiallar</p>
                  <div className="mt-2 space-y-2">
                    {accessibleFactories.map((factory) => (
                      <button
                        key={factory.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:border-primary/40"
                        onClick={async () => {
                          if (factory.id === activeFactoryId) return;
                          setActiveFactory(factory.id);
                          await queryClient.invalidateQueries();
                        }}
                      >
                        <span>{factory.name}</span>
                        {factory.id === activeFactoryId ? (
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Tanlangan</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Tanlash</span>
                        )}
                      </button>
                    ))}
                    {accessibleFactories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Filial biriktirilmagan.</p>
                    ) : null}
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAccountOpen(false);
                    router.push("/profile");
                  }}
                >
                  <UserRound size={16} />
                  Profil
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAccountOpen(false);
                    router.push("/notifications");
                  }}
                >
                  <Bell size={16} />
                  Xabarlar
                </Button>
              </div>

              <form className="space-y-4 flex flex-col h-full min-h-[min-content]" onSubmit={handlePasswordSubmit}>
                <FormField htmlFor="current-password" label="Hozirgi parol" required>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(event) => {
                      setPasswordForm({ ...passwordForm, currentPassword: event.target.value });
                      setPasswordStatus("idle");
                    }}
                  />
                </FormField>
                <FormField htmlFor="new-password" label="Yangi parol" required>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={passwordForm.password}
                    onChange={(event) => {
                      setPasswordForm({ ...passwordForm, password: event.target.value });
                      setPasswordStatus("idle");
                    }}
                  />
                </FormField>
                {passwordStatus === "success" ? (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    Parol yangilandi.
                  </p>
                ) : null}
                {passwordStatus === "error" ? (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                    Parol yangilanmadi. Hozirgi parolni tekshiring.
                  </p>
                ) : null}
                <DrawerFooter><Button
                  className="w-full"
                  type="submit"
                  disabled={
                    passwordForm.currentPassword.trim().length === 0 ||
                    passwordForm.password.trim().length < 8 ||
                    passwordStatus === "saving"
                  }
                >
                  {passwordStatus === "saving" ? "Yangilanmoqda..." : "Parolni yangilash"}
                </Button></DrawerFooter>
              </form>

              <Button
                type="button"
                variant="outline"
                className="w-full border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Chiqish
              </Button>
            </div>
          </Drawer>
        </div>
      </div>
    </header>
  );
}
