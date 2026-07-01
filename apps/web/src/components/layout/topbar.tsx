"use client";

import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
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

  return <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-8"><button className="lg:hidden" aria-label="Menyu" onClick={onMenuClick}><Menu /></button><div className="hidden lg:block"><p className="text-sm font-medium">Paypoq OS</p><p className="text-xs text-muted-foreground">Application foundation</p></div><div className="ml-auto flex items-center gap-2"><button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted" aria-label="Mavzuni almashtirish" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button><button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted" aria-label="Bildirishnomalar"><Bell size={18} /></button><div className="ml-1 hidden text-right sm:block"><p className="text-xs font-medium">{currentUser?.name ?? "Paypoq OS"}</p><button className="text-xs text-muted-foreground hover:text-foreground" type="button" onClick={handleLogout}>Chiqish</button></div><div className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{initials}</div></div></header>;
}
