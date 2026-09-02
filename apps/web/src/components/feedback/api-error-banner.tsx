"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  API_FORBIDDEN_EVENT,
  type ApiForbiddenDetail,
} from "@/lib/api/client";
import { getDefaultHomePath } from "@/lib/access-control";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

/**
 * Surfaces unexpected 403 responses (e.g. deep link mutation, stale UI).
 * Backend remains source of truth; this is operator-facing recovery UX.
 */
export function ApiErrorBanner() {
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const [detail, setDetail] = useState<ApiForbiddenDetail | null>(null);

  useEffect(() => {
    function onForbidden(event: Event) {
      const custom = event as CustomEvent<ApiForbiddenDetail>;
      setDetail(custom.detail);
    }

    window.addEventListener(API_FORBIDDEN_EVENT, onForbidden);
    return () => window.removeEventListener(API_FORBIDDEN_EVENT, onForbidden);
  }, []);

  if (!detail) return null;

  const homePath = getDefaultHomePath(permissions, roles);

  return (
    <div
      role="alert"
      className="sticky top-14 z-30 border-b border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100 sm:top-16"
    >
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">Bu amal uchun ruxsatingiz yo‘q</p>
          <p className="text-rose-100/90">
            {detail.message ||
              "Rolingiz bu ma’lumotni ko‘rish yoki o‘zgartirishga ruxsat bermaydi."}
          </p>
          <p className="text-xs text-rose-200/80">
            Kerak bo‘lsa korxona egasidan ruxsat so‘rang yoki ruxsat berilgan
            bo‘limga o‘ting.
          </p>
          <Link href={homePath} className="inline-block text-xs font-semibold underline">
            Ruxsat berilgan sahifaga o‘tish
          </Link>
        </div>
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-rose-500/20"
          aria-label="Yopish"
          onClick={() => setDetail(null)}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
