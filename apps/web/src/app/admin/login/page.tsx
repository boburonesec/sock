"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

export default function PlatformAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const login = usePlatformAuthStore((state) => state.login);
  const refreshSession = usePlatformAuthStore((state) => state.refreshSession);
  const isAuthenticated = usePlatformAuthStore((state) => state.isAuthenticated);
  const isLoadingSession = usePlatformAuthStore((state) => state.isLoadingSession);
  const hasLoadedSession = usePlatformAuthStore((state) => state.hasLoadedSession);

  useEffect(() => {
    if (!hasLoadedSession) {
      void refreshSession();
    }
  }, [hasLoadedSession, refreshSession]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/admin/tenants");
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password);
      router.replace("/admin/tenants");
    } catch {
      setError("Email yoki parol noto‘g‘ri.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-6">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
            PA
          </div>
          <h1 className="text-2xl font-bold">Paypoq OS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin panel
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField htmlFor="email" label="Email" required>
            <Input
              id="email"
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isLoadingSession}
            />
          </FormField>

          <FormField htmlFor="password" label="Parol" required>
            <Input
              id="password"
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoadingSession}
            />
          </FormField>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <Button className="w-full" type="submit" disabled={isLoadingSession}>
            {isLoadingSession ? "Tekshirilmoqda..." : "Kirish"}
          </Button>
        </form>
      </section>
    </main>
  );
}
