"use client";

import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
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

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button className="lg:hidden" aria-label="Menyu" onClick={onMenuClick}>
        <Menu />
      </button>
      <div className="hidden lg:block">
        <p className="text-sm font-medium">Paypoq OS</p>
        <p className="text-xs text-muted-foreground">Fabrika boshqaruvi</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted"
          aria-label="Mavzuni almashtirish"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted"
          aria-label="Bildirishnomalar"
        >
          <Bell size={18} />
        </button>
        <div className="relative ml-1">
          {userMenuOpen && (
            <button
              aria-label="User menyuni yopish"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setUserMenuOpen(false)}
            />
          )}
          <button
            type="button"
            className="relative z-30 flex h-11 items-center gap-3 rounded-full border bg-card px-2 pl-3 text-left shadow-sm hover:bg-muted"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((open) => !open)}
          >
            <span className="hidden sm:block">
              <span className="block text-xs font-medium">{currentUser?.name ?? "Paypoq OS"}</span>
              <span className="block text-xs text-muted-foreground">Profil</span>
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {initials}
            </span>
            <ChevronDown className="hidden text-muted-foreground sm:block" size={16} />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-12 z-30 w-64 rounded-xl border bg-card p-2 text-card-foreground shadow-2xl">
              <div className="border-b px-3 py-2">
                <p className="font-medium">{currentUser?.name ?? "Paypoq OS"}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </div>
              <Link
                href="/profile"
                className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setUserMenuOpen(false)}
              >
                <UserRound size={16} />
                Profil
              </Link>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
