"use client";

import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useUiStore } from "@/stores/ui-store";
import { AppContainer } from "./app-container";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar mobileOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <button aria-label="Menyuni ochish" onClick={() => setSidebarOpen(true)} className="fixed bottom-5 right-5 z-20 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"><Menu size={22} /></button>
        <AppContainer>{children}</AppContainer>
      </main>
    </div>
  );
}
