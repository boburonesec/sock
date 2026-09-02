"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { dashboardApi } from "@/lib/api/dashboard";
import { formatDateTimeForUser } from "@/lib/format";

export function FactoryTvSettingsPage() {
  const queryClient = useQueryClient();
  const [newToken, setNewToken] = useState<string | null>(null);
  const { data, error, isError, isPending, refetch } = useQuery({
    queryKey: ["dashboard", "factory-tv-credential"],
    queryFn: dashboardApi.getFactoryTvCredentialStatus,
  });

  const generate = useMutation({
    mutationFn: dashboardApi.generateFactoryTvCredential,
    onSuccess: (response) => {
      setNewToken(response.data.token);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "factory-tv-credential"] });
    },
  });

  const revoke = useMutation({
    mutationFn: dashboardApi.revokeFactoryTvCredential,
    onSuccess: () => {
      setNewToken(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard", "factory-tv-credential"] });
    },
  });

  if (isPending) {
    return <LoadingState label="Factory TV holati yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Factory TV holati yuklanmadi"
        description={
          error instanceof Error ? error.message : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const status = data?.data;
  const tvUrl =
    newToken && typeof window !== "undefined"
      ? `${window.location.origin}/tv?token=${newToken}`
      : null;

  return (
    <div className="space-y-6">
      <PageSection
        title="Fabrika TV ekrani"
        description="Sex zalidagi televizor/monitorda ko‘rsatiladigan, alohida havola orqali ochiladigan panel."
      >
        <div className="space-y-4 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            Bu havola parolsiz ochiladi — kim ushbu havolaga ega bo‘lsa, shu
            fabrikaning joriy ishlab chiqarish holatini ko‘ra oladi (mijoz
            ismlari, pul summalari ko‘rsatilmaydi). Shuning uchun uni faqat
            sex ichidagi ekranga o‘rnating, tashqi internetga ochiq joyga
            joylashtirmang.
          </p>

          {status?.hasActiveCredential ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              <p>Faol havola mavjud.</p>
              <p className="mt-1 text-emerald-200/80">
                Yaratilgan: {status.createdAt ? formatDateTimeForUser(status.createdAt) : "—"}
                {" · "}
                Oxirgi ishlatilgan:{" "}
                {status.lastUsedAt ? formatDateTimeForUser(status.lastUsedAt) : "hali ishlatilmagan"}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Hali havola yaratilmagan.
            </p>
          )}

          {generate.isError ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {getErrorMessage(generate.error)}
            </p>
          ) : null}
          {revoke.isError ? (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {getErrorMessage(revoke.error)}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={generate.isPending}
              onClick={() => generate.mutate()}
            >
              {generate.isPending
                ? "Yaratilmoqda..."
                : status?.hasActiveCredential
                  ? "Yangi havola yaratish (eskisi bekor bo‘ladi)"
                  : "Havola yaratish"}
            </Button>
            {status?.hasActiveCredential ? (
              <Button
                type="button"
                variant="outline"
                className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate()}
              >
                {revoke.isPending ? "Bekor qilinmoqda..." : "Havolani bekor qilish"}
              </Button>
            ) : null}
          </div>

          {tvUrl ? (
            <div className="mt-2 space-y-2 rounded-xl border border-emerald-500/45 bg-emerald-950/70 p-4 text-emerald-50 shadow-inner shadow-black/20">
              <p className="text-xs uppercase text-emerald-200">
                Havola faqat shu yerda to‘liq ko‘rsatiladi
              </p>
              <p className="select-all break-all font-mono text-sm text-emerald-50">{tvUrl}</p>
              <p className="text-sm text-emerald-100">
                Shu havolani sex zalidagi kompyuter yoki televizor brauzerida oching.
              </p>
            </div>
          ) : null}
        </div>
      </PageSection>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const message =
      typeof error.body === "object" && error.body && "message" in error.body
        ? (error.body as { message?: unknown }).message
        : null;

    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }

  return error instanceof Error ? error.message : "Amal bajarilmadi.";
}
