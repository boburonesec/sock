"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/api/query-keys";
import { salesApi, type Client, type ClientPayload } from "@/lib/api/sales";
import { ClientDetailsDrawer } from "./components/client-details-drawer";
import { ClientFormDrawer } from "./components/client-form-drawer";
import { ClientsTable } from "./components/clients-table";
import { useClients } from "./use-clients";

type FormState =
  | { mode: "create"; client: null }
  | { mode: "edit"; client: Client };

export function ClientsModule() {
  const queryClient = useQueryClient();
  const { data, error, isError, isPending, refetch } = useClients();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [clientToArchive, setClientToArchive] = useState<Client | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createClient = useMutation({
    mutationFn: salesApi.createClient,
    onSuccess: () => invalidateClientQueries(queryClient),
  });
  const updateClient = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientPayload }) =>
      salesApi.updateClient(id, payload),
    onSuccess: () => invalidateClientQueries(queryClient),
  });
  const archiveClient = useMutation({
    mutationFn: salesApi.archiveClient,
    onSuccess: () => invalidateClientQueries(queryClient),
  });

  if (isPending) {
    return <LoadingState label="Mijozlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Mijozlar yuklanmadi"
        description={
          error instanceof Error
            ? error.message
            : "Ma’lumotlarni olishda xatolik yuz berdi."
        }
        action={
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Qayta urinish
          </Button>
        }
      />
    );
  }

  const clients = data?.data ?? [];
  const formError =
    createClient.error instanceof Error
      ? createClient.error.message
      : updateClient.error instanceof Error
        ? updateClient.error.message
        : null;

  return (
    <div className="space-y-8">
      {feedback ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <PageSection>
        <div className="grid gap-4 sm:max-w-sm">
          <KpiCard
            label="Jami faol mijozlar"
            value={`${clients.length} ta`}
            description="tizim qaytargan faol mijoz yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="Mijozlar"
        description="Sotuvchilar hozircha barcha mijozlarni ko‘ra oladi."
      >
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setFeedback(null);
              createClient.reset();
              updateClient.reset();
              setFormState({ mode: "create", client: null });
            }}
          >
            Mijoz qo‘shish
          </Button>
        </div>
        <ClientsTable clients={clients} onSelect={setSelectedClient} />
      </PageSection>

      <ClientDetailsDrawer
        client={selectedClient}
        isArchiving={archiveClient.isPending}
        onOpenChange={(open) => {
          if (!open) setSelectedClient(null);
        }}
        onEdit={(client) => {
          setFeedback(null);
          createClient.reset();
          updateClient.reset();
          setFormState({ mode: "edit", client });
        }}
        onArchive={(client) => {
          setFeedback(null);
          setClientToArchive(client);
        }}
      />

      <ClientFormDrawer
        open={Boolean(formState)}
        mode={formState?.mode ?? "create"}
        client={formState?.client ?? null}
        isSubmitting={createClient.isPending || updateClient.isPending}
        errorMessage={formError}
        onOpenChange={(open) => {
          if (!open) setFormState(null);
        }}
        onSubmit={async (payload) => {
          if (createClient.isPending || updateClient.isPending) return;
          setFeedback(null);

          if (formState?.mode === "edit") {
            await updateClient.mutateAsync({
              id: formState.client.id,
              payload,
            });
            setFeedback({
              tone: "success",
              message: "Mijoz ma’lumotlari yangilandi.",
            });
          } else {
            await createClient.mutateAsync(payload);
            setFeedback({ tone: "success", message: "Yangi mijoz yaratildi." });
          }

          setFormState(null);
          setSelectedClient(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(clientToArchive)}
        onOpenChange={(open) => {
          if (!open) setClientToArchive(null);
        }}
        title="Mijozni arxivlash"
        description={
          clientToArchive
            ? `${clientToArchive.name} faol ro‘yxatdan chiqariladi. Buyurtmalar va to‘lovlar o‘chirilmaydi.`
            : "Mijoz arxivlanadi."
        }
        confirmLabel={
          archiveClient.isPending ? "Arxivlanmoqda..." : "Arxivlash"
        }
        destructive
        onConfirm={() => {
          if (!clientToArchive) return;
          const clientName = clientToArchive.name;
          archiveClient.mutate(clientToArchive.id, {
            onSuccess: () => {
              setFeedback({
                tone: "success",
                message: `${clientName} arxivlandi.`,
              });
              setSelectedClient(null);
              setClientToArchive(null);
            },
            onError: (mutationError) => {
              setFeedback({
                tone: "error",
                message:
                  mutationError instanceof Error
                    ? mutationError.message
                    : "Mijozni arxivlashda xatolik yuz berdi.",
              });
            },
          });
        }}
      />
    </div>
  );
}

async function invalidateClientQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.clients() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.summary() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.debts() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
  ]);
}
