"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/feedback/loading-state";
import { usePlatformAuthStore } from "@/stores/platform-auth-store";

export function PlatformAdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    if (hasLoadedSession && !isLoadingSession && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [hasLoadedSession, isAuthenticated, isLoadingSession, router]);

  if (!hasLoadedSession || isLoadingSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <LoadingState label="Platform sessiyasi tekshirilmoqda..." />
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
