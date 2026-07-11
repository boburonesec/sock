"use client";

import { ApiErrorBanner } from "@/components/feedback/api-error-banner";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useUiStore } from "@/stores/ui-store";
import { AppContainer } from "./app-container";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar mobileOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-w-0 lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <ApiErrorBanner />
        <AppContainer className="safe-pb">{children}</AppContainer>
      </main>
    </div>
  );
}
