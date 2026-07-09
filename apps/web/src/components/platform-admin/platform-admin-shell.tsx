"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Drawer } from "@/components/overlays/drawer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { platformAuthApi } from "@/lib/api/platform-auth";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

function formatStatus(status?: string): string {
  if (status === "ACTIVE") return "Faol";
  if (status === "SUSPENDED") return "To‘xtatilgan";
  return status ?? "Noma’lum";
}

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "" });
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const platformAdmin = usePlatformAuthStore((state) => state.platformAdmin);
  const logout = usePlatformAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.replace("/admin/login");
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passwordForm.currentPassword.trim().length === 0 || passwordForm.password.trim().length < 8) {
      return;
    }

    setPasswordStatus("saving");
    try {
      await platformAuthApi.changePassword({
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
    <main className="min-h-dvh bg-background text-foreground">
      <header className="border-b bg-card/70 safe-pt">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <Link href="/admin/tenants" className="text-base font-black sm:text-lg">
              Paypoq OS Admin
            </Link>
            <p className="truncate text-xs text-muted-foreground">
              <span className="hidden sm:inline">Korxonalarni boshqarish paneli · </span>
              {platformAdmin?.email}
            </p>
          </div>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              href="/admin/tenants"
            >
              Korxonalar
            </Link>
            <div>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90"
                aria-label="Akkaunt oynasini ochish"
                onClick={() => {
                  setAccountOpen(true);
                  setPasswordStatus("idle");
                }}
              >
                PA
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
                description="Admin ma’lumotlari va parol sozlamalari"
              >
                <div className="space-y-5">
                  <section className="rounded-xl border p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        PA
                      </span>
                      <div>
                        <p className="font-semibold">{platformAdmin?.name ?? "Admin"}</p>
                        <p className="text-sm text-muted-foreground">{platformAdmin?.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Holat</p>
                        <p className="font-medium">{formatStatus(platformAdmin?.status)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ruxsat turi</p>
                        <p className="font-medium">Korxonalarni boshqarish</p>
                      </div>
                    </div>
                  </section>

                  <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                    <FormField htmlFor="platform-current-password" label="Hozirgi parol" required>
                      <Input
                        id="platform-current-password"
                        type="password"
                        autoComplete="current-password"
                        value={passwordForm.currentPassword}
                        onChange={(event) => {
                          setPasswordForm({ ...passwordForm, currentPassword: event.target.value });
                          setPasswordStatus("idle");
                        }}
                      />
                    </FormField>
                    <FormField htmlFor="platform-new-password" label="Yangi parol" required>
                      <Input
                        id="platform-new-password"
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
                    <Button
                      className="w-full"
                      type="submit"
                      disabled={
                        passwordForm.currentPassword.trim().length === 0 ||
                        passwordForm.password.trim().length < 8 ||
                        passwordStatus === "saving"
                      }
                    >
                      {passwordStatus === "saving" ? "Yangilanmoqda..." : "Parolni yangilash"}
                    </Button>
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
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-3 py-5 safe-pb sm:px-6 sm:py-8">{children}</section>
    </main>
  );
}
