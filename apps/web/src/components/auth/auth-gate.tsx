"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/feedback/loading-state";
import { useAuthStore } from "@/stores/auth-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoadingSession = useAuthStore((state) => state.isLoadingSession);
  const hasLoadedSession = useAuthStore((state) => state.hasLoadedSession);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  useEffect(() => {
    if (!hasLoadedSession) {
      void refreshSession();
    }
  }, [hasLoadedSession, refreshSession]);

  useEffect(() => {
    if (hasLoadedSession && !isLoadingSession && !isAuthenticated) {
      router.replace("/login");
    }
  }, [hasLoadedSession, isAuthenticated, isLoadingSession, router]);

  if (!hasLoadedSession || isLoadingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <LoadingState label="Sessiya tekshirilmoqda..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
