"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { KpiCard } from "@/components/cards/kpi-card";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/api/query-keys";
import {
  salesApi,
  type ClientPayment,
  type CreateClientPaymentPayload,
} from "@/lib/api/sales";
import { PaymentCreateDrawer } from "./components/payment-create-drawer";
import { PaymentDetailsDrawer } from "./components/payment-details-drawer";
import { PaymentReverseDialog } from "./components/payment-reverse-dialog";
import { PaymentsTable } from "./components/payments-table";
import { usePayments } from "./use-payments";
import { formatCurrency } from "@/lib/utils";

export function PaymentsModule() {
  const queryClient = useQueryClient();
  const { data, error, isError, isPending, refetch } = usePayments();
  const clientsQuery = useQuery({
    queryKey: queryKeys.sales.clients(),
    queryFn: salesApi.getClients,
  });
  const ordersQuery = useQuery({
    queryKey: queryKeys.sales.orders(),
    queryFn: salesApi.getOrders,
  });
  const debtsQuery = useQuery({
    queryKey: queryKeys.sales.debts(),
    queryFn: salesApi.getDebts,
  });
  const [selectedPayment, setSelectedPayment] = useState<ClientPayment | null>(
    null,
  );
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createPayment = useMutation({
    mutationFn: salesApi.createPayment,
    onSuccess: () => invalidatePaymentQueries(queryClient),
  });
  const reversePayment = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      salesApi.reversePayment(id, { reason }),
    onSuccess: async (response) => {
      await invalidatePaymentQueries(queryClient);
      setSelectedPayment(response.data);
      setIsReverseDialogOpen(false);
      setFeedback({
        tone: "success",
        message: "To‘lov bekor qilindi. Qarz va buyurtma holati qayta hisoblandi.",
      });
    },
    onError: (mutationError) => {
      setFeedback({
        tone: "error",
        message:
          mutationError instanceof Error
            ? mutationError.message
            : "To‘lovni bekor qilishda xatolik yuz berdi.",
      });
    },
  });

  if (isPending) {
    return <LoadingState label="To‘lovlar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="To‘lovlar yuklanmadi"
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

  const payments = data?.data ?? [];
  const clients = clientsQuery.data?.data ?? [];
  const orders = ordersQuery.data?.data ?? [];
  const createError =
    createPayment.error instanceof Error ? createPayment.error.message : null;

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
            label="Jami to‘lov yozuvlari"
            value={`${payments.length} ta`}
            description="ma’lumot qaytargan to‘lov yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="To‘lovlar"
        description="To‘lovlar buyurtmadan alohida qayd qilinadi."
      >
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setFeedback(null);
              createPayment.reset();
              setIsCreateDrawerOpen(true);
            }}
          >
            To‘lov qayd qilish
          </Button>
        </div>
        <PaymentsTable payments={payments} onSelect={setSelectedPayment} />
      </PageSection>

      <PaymentDetailsDrawer
        payment={selectedPayment}
        isReversing={reversePayment.isPending}
        onReverseClick={() => {
          setFeedback(null);
          reversePayment.reset();
          setIsReverseDialogOpen(true);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayment(null);
            setIsReverseDialogOpen(false);
          }
        }}
      />

      <PaymentReverseDialog
        open={isReverseDialogOpen}
        isSubmitting={reversePayment.isPending}
        errorMessage={
          reversePayment.error instanceof Error
            ? reversePayment.error.message
            : null
        }
        onOpenChange={setIsReverseDialogOpen}
        onConfirm={async (reason) => {
          if (!selectedPayment) return;
          await reversePayment.mutateAsync({ id: selectedPayment.id, reason });
        }}
      />

      <PaymentCreateDrawer
        open={isCreateDrawerOpen}
        clients={clients}
        debts={debtsQuery.data?.data ?? []}
        orders={orders}
        isSubmitting={createPayment.isPending}
        isOptionsLoading={
          clientsQuery.isPending || ordersQuery.isPending || debtsQuery.isPending
        }
        errorMessage={createError}
        onOpenChange={setIsCreateDrawerOpen}
        onSubmit={async (payload: CreateClientPaymentPayload) => {
          setFeedback(null);
          const response = await createPayment.mutateAsync(payload);
          setFeedback({
            tone: "success",
            message: `${response.data.client.name} uchun ${formatCurrency(response.data.amount)} to‘lov qayd qilindi va buyurtmalarga taqsimlandi. Qarz ma’lumoti backenddan yangilanmoqda.`,
          });
          setIsCreateDrawerOpen(false);
          return response.data;
        }}
      />
    </div>
  );
}

async function invalidatePaymentQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.payments() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.orders() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.debts() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.summary() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
  ]);
}
