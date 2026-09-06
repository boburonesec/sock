"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

function getSafeReturnUrl(rawUrl: string | null, fallback: string): string {
  if (!rawUrl) return fallback;
  if (
    rawUrl.startsWith("/") &&
    !rawUrl.startsWith("//") &&
    !rawUrl.startsWith("/admin/login") &&
    !rawUrl.startsWith("/login")
  ) {
    return rawUrl;
  }
  return fallback;
}

function PlatformAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get("returnUrl");
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
      const destination = getSafeReturnUrl(returnUrlParam, "/admin/tenants");
      router.replace(destination);
    }
  }, [isAuthenticated, returnUrlParam, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await login(email, password);
      const destination = getSafeReturnUrl(returnUrlParam, "/admin/tenants");
      router.replace(destination);
    } catch {
      setError("Email yoki parol noto‘g‘ri.");
    }
  }

  return (
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
  );
}

export default function PlatformAdminLoginPage() {
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

        <Suspense fallback={<div className="text-sm text-muted-foreground">Yuklanmoqda...</div>}>
          <PlatformAdminLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
