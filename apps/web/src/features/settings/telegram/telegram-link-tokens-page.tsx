"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-display/data-table";
import { StatusBadge, type StatusTone } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/api/query-keys";
import { telegramApi, type TelegramAccountListItem } from "@/lib/api/telegram";

export function TelegramLinkTokensPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const accountsQuery = useQuery({
    queryKey: queryKeys.telegram.accounts(),
    queryFn: telegramApi.getAccounts,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.telegram.health(),
    queryFn: telegramApi.getHealth,
  });

  const tokensQuery = useQuery({
    queryKey: queryKeys.telegram.linkTokens(),
    queryFn: telegramApi.getLinkTokens,
  });

  const blockMutation = useMutation({
    mutationFn: telegramApi.blockAccount,
    onSuccess: async () => {
      setFeedback({ tone: "success", message: "Telegram akkaunt bloklandi." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.telegram.accounts() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.telegram.health() }),
      ]);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Telegram akkaunt bloklashda xatolik yuz berdi.",
      });
    },
  });

  const isPending = accountsQuery.isPending || healthQuery.isPending || tokensQuery.isPending;
  const firstError = accountsQuery.error ?? healthQuery.error ?? tokensQuery.error;

  if (isPending) {
    return <LoadingState label="Telegram ma’lumotlari yuklanmoqda..." />;
  }

  if (accountsQuery.isError || healthQuery.isError || tokensQuery.isError) {
    return (
      <ErrorState
        title="Telegram ma’lumotlari yuklanmadi"
        description={
          firstError instanceof Error
            ? firstError.message
            : "Telegram akkaunt, holat yoki link-token ro‘yxatini olishda xatolik yuz berdi."
        }
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void accountsQuery.refetch();
              void healthQuery.refetch();
              void tokensQuery.refetch();
            }}
          >
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const accounts = accountsQuery.data?.data ?? [];
  const health = healthQuery.data?.data ?? null;
  const tokens = tokensQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={
            feedback.tone === "success"
              ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              : "rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          }
        >
          {feedback.message}
        </div>
      ) : null}

      <PageSection
        title="Telegram holati"
        description="Telegram ulanishlari va sozlamalari holati ko‘rsatiladi."
      >
        {!health ? (
          <EmptyState title="Telegram holati yo‘q" description="Hozircha Telegram bo‘yicha ma’lumot kelmadi." />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <HealthCard label="Holat" value={health.status.toUpperCase()} tone="success" />
            <HealthCard label="Ulangan akkauntlar" value={health.counts.activeAccounts} tone="info" />
            <HealthCard label="Link tokenlar" value={health.counts.linkTokens} tone="neutral" />
            <HealthCard
              label="Ichki kalit"
              value={health.checks.botInternalApiKeyConfigured ? "Sozlangan" : "Yo‘q"}
              tone={health.checks.botInternalApiKeyConfigured ? "success" : "danger"}
            />
            <HealthCard
              label="Link kodi siri"
              value={health.checks.linkTokenSecretConfigured ? "Sozlangan" : "Yo‘q"}
              tone={health.checks.linkTokenSecretConfigured ? "success" : "danger"}
            />
            <HealthCard label="Ma’lumotlar bazasi" value={health.checks.database.toUpperCase()} tone="success" />
          </div>
        )}
      </PageSection>

      <PageSection
        title="Telegram akkauntlari"
        description="Xodim, mijoz yoki foydalanuvchiga bog‘langan Telegram akkauntlari."
      >
        {accounts.length === 0 ? (
          <EmptyState
            title="Telegram akkauntlari yo‘q"
            description="Hali Telegram orqali ulangan xodim yoki mijoz yo‘q."
          />
        ) : (
          <DataTable label="Telegram akkauntlari">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Turi</DataTableHeader>
                <DataTableHeader>Kimga ulangan</DataTableHeader>
                <DataTableHeader>Telegram ID</DataTableHeader>
                <DataTableHeader>Status</DataTableHeader>
                <DataTableHeader>Ulangan vaqt</DataTableHeader>
                <DataTableHeader>Holat o‘zgargan vaqt</DataTableHeader>
                <DataTableHeader>Amal</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {accounts.map((account) => (
                <DataTableRow key={account.id}>
                  <DataTableCell>{formatTargetType(account.type)}</DataTableCell>
                  <DataTableCell>
                    <div className="font-medium">
                      {account.linkedEntity?.name ?? "Nomi topilmadi"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {account.linkedEntity?.id ?? "ID mavjud emas"}
                    </div>
                  </DataTableCell>
                  <DataTableCell>{account.telegramUserIdMasked}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge tone={statusTone(account.status)}>
                      {formatAccountStatus(account.status)}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell>{formatDateTime(account.linkedAt)}</DataTableCell>
                  <DataTableCell>
                    {account.blockedAt
                      ? `Bloklangan: ${formatDateTime(account.blockedAt)}`
                      : account.unlinkedAt
                        ? `Uzilgan: ${formatDateTime(account.unlinkedAt)}`
                        : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                      disabled={
                        account.status !== "ACTIVE" ||
                        blockMutation.isPending
                      }
                      onClick={() => handleBlock(account, blockMutation.mutate)}
                    >
                      Bloklash
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </PageSection>

      <PageSection
        title="Telegram link tokenlar"
        description="Kod faqat yaratilgan paytda bir marta ko‘rinadi."
      >
        {tokens.length === 0 ? (
          <EmptyState
            title="Telegram tokenlar yo‘q"
            description="Hali employee yoki client uchun Telegram link kodi yaratilmagan."
          />
        ) : (
          <DataTable label="Telegram link tokenlar">
            <DataTableHead>
              <DataTableRow>
                <DataTableHeader>Ulanadigan tur</DataTableHeader>
                <DataTableHeader>Ulanadigan odam</DataTableHeader>
                <DataTableHeader>Muddati</DataTableHeader>
                <DataTableHeader>Ishlatilgan</DataTableHeader>
                <DataTableHeader>Yaratilgan</DataTableHeader>
              </DataTableRow>
            </DataTableHead>
            <tbody>
              {tokens.map((token) => (
                <DataTableRow key={token.id}>
                  <DataTableCell>{formatTargetType(token.targetType)}</DataTableCell>
                  <DataTableCell>
                    <div className="font-medium">
                      {token.targetName ?? "Nomi ko‘rsatilmagan"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {token.targetId ?? "ID mavjud emas"}
                    </div>
                  </DataTableCell>
                  <DataTableCell>{formatDateTime(token.expiresAt)}</DataTableCell>
                  <DataTableCell>
                    {token.usedAt ? formatDateTime(token.usedAt) : "Yo‘q"}
                  </DataTableCell>
                  <DataTableCell>{formatDateTime(token.createdAt)}</DataTableCell>
                </DataTableRow>
              ))}
            </tbody>
          </DataTable>
        )}
      </PageSection>
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: StatusTone;
}) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-3">
        <StatusBadge tone={tone}>{value}</StatusBadge>
      </div>
    </div>
  );
}

function handleBlock(
  account: TelegramAccountListItem,
  blockAccount: (accountId: string) => void,
) {
  const entityName = account.linkedEntity?.name ?? "Telegram akkaunti";
  const confirmed = window.confirm(
    `${entityName} uchun Telegram akkauntini bloklashni tasdiqlaysizmi? Qayta ochish hozircha mavjud emas.`,
  );

  if (confirmed) {
    blockAccount(account.id);
  }
}

function statusTone(status: string): StatusTone {
  const tones: Record<string, StatusTone> = {
    ACTIVE: "success",
    UNLINKED: "neutral",
    BLOCKED: "danger",
  };

  return tones[status] ?? "neutral";
}

function formatAccountStatus(value: string): string {
  const labels: Record<string, string> = {
    ACTIVE: "Faol",
    UNLINKED: "Uzilgan",
    BLOCKED: "Bloklangan",
  };

  return labels[value] ?? value;
}

function formatTargetType(value: string): string {
  const labels: Record<string, string> = {
    EMPLOYEE: "Xodim",
    CLIENT: "Client",
    USER: "Foydalanuvchi",
  };

  return labels[value] ?? value;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
