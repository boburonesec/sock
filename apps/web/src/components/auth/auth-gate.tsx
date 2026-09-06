"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const sessionError = useAuthStore((state) => state.sessionError);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!hasLoadedSession) {
      void refreshSession();
    }
  }, [hasLoadedSession, refreshSession]);

  useEffect(() => {
    // Only redirect to login when session was verified and definitively rejected as unauthenticated (not on server cold start / network drop)
    if (hasLoadedSession && !isLoadingSession && !isAuthenticated && !sessionError) {
      const returnParam =
        pathname && pathname !== "/" && pathname !== "/login"
          ? `?returnUrl=${encodeURIComponent(pathname)}`
          : "";
      router.replace(`/login${returnParam}`);
    }
  }, [hasLoadedSession, isAuthenticated, isLoadingSession, sessionError, pathname, router]);

  if (!hasLoadedSession || isLoadingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <LoadingState label="Sessiya tekshirilmoqda..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (sessionError) {
      return (
        <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
          <div className="panel mx-auto w-full max-w-md p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
              <span className="text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold sm:text-xl">Serverga ulanib bo‘lmadi</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Server uyg‘onmoqda yoki internet aloqasida uzilish bor. Biroz kuting va qayta urinib ko‘ring.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                className="w-full"
                type="button"
                onClick={() => void refreshSession()}
              >
                Qayta urinish
              </Button>
              <Button
                variant="outline"
                className="w-full"
                type="button"
                onClick={() => {
                  clearSession();
                  router.replace("/login");
                }}
              >
                Kirish sahifasiga o‘tish
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}
