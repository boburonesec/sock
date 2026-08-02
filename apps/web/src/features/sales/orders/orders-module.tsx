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
import { ConfirmDialog } from "@/components/overlays/confirm-dialog";
import { Button } from "@/components/ui/button";
import { productApi } from "@/lib/api/product";
import { queryKeys } from "@/lib/api/query-keys";
import {
  salesApi,
  type CreateSalesOrderPayload,
  type DeliverSalesOrderPayload,
  type SalesOrder,
} from "@/lib/api/sales";
import { DeliveryConfirmDrawer } from "./components/delivery-confirm-drawer";
import { OrderDetailsDrawer } from "./components/order-details-drawer";
import { OrderCreateDrawer } from "./components/order-create-drawer";
import { OrdersTable } from "./components/orders-table";
import { useOrders } from "./use-orders";

export function OrdersModule() {
  const queryClient = useQueryClient();
  const { data, error, isError, isPending, refetch } = useOrders();
  const clientsQuery = useQuery({
    queryKey: queryKeys.sales.clients(),
    queryFn: salesApi.getClients,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.product.products(),
    queryFn: productApi.getProducts,
  });
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [deliveryTarget, setDeliveryTarget] = useState<SalesOrder | null>(null);
  const [returnTarget, setReturnTarget] = useState<SalesOrder | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SalesOrder | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createOrder = useMutation({
    mutationFn: salesApi.createOrder,
    onSuccess: () => invalidateOrderQueries(queryClient),
  });
  const updateOrder = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateSalesOrderPayload;
    }) => salesApi.updateOrder(id, payload),
    onSuccess: async (response) => {
      setSelectedOrder(response.data);
      setEditOrder(null);
      await invalidateOrderQueries(queryClient);
    },
  });
  const cancelOrder = useMutation({
    mutationFn: salesApi.cancelOrder,
    onSuccess: async (response) => {
      setSelectedOrder(response.data);
      setCancelTarget(null);
      setFeedback({
        tone: "success",
        message: "Buyurtma bekor qilindi. Qarz hisobidan chiqarildi.",
      });
      await invalidateOrderQueries(queryClient);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Buyurtmani bekor qilishda xatolik yuz berdi.",
      });
    },
  });
  const deliverOrder = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: DeliverSalesOrderPayload;
    }) => salesApi.deliverOrder(id, payload),
    onSuccess: async (response, variables) => {
      setSelectedOrder(response.data);
      setDeliveryTarget(null);
      const withLogistics =
        variables.payload.deliveryCost != null &&
        String(variables.payload.deliveryCost).trim() !== "";
      setFeedback({
        tone: "success",
        message: withLogistics
          ? "Buyurtma yetkazildi. Ombor kamaydi; logistika chiqimi moliya (Transport) da yozildi."
          : "Buyurtma yetkazildi. Ombor stock tizim tomonidan kamaytirildi.",
      });
      await invalidateOrderQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.finance.expenses() });
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Buyurtmani yetkazishda xatolik yuz berdi.",
      });
    },
  });
  const returnDelivery = useMutation({
    mutationFn: salesApi.returnDelivery,
    onSuccess: async (response) => {
      setSelectedOrder(response.data);
      setReturnTarget(null);
      setFeedback({
        tone: "success",
        message:
          "Yetkazuv qaytarildi. Stock qaytdi, mijoz to‘lovi o‘zgarmadi.",
      });
      await invalidateOrderQueries(queryClient);
    },
    onError: (error) => {
      setFeedback({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Delivery return qilishda xatolik yuz berdi.",
      });
    },
  });

  if (isPending) {
    return <LoadingState label="Buyurtmalar yuklanmoqda..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Buyurtmalar yuklanmadi"
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

  const orders = data?.data ?? [];
  const clients = clientsQuery.data?.data ?? [];
  const variants =
    productsQuery.data?.data.flatMap((product) => product.variants) ?? [];
  const createError =
    createOrder.error instanceof Error ? createOrder.error.message : null;
  const updateError =
    updateOrder.error instanceof Error ? updateOrder.error.message : null;
  const deliverError =
    deliverOrder.error instanceof Error ? deliverOrder.error.message : null;

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
            label="Jami buyurtma yozuvlari"
            value={`${orders.length} ta`}
            description="ma’lumot qaytargan buyurtma yozuvlari"
            accent="primary"
          />
        </div>
      </PageSection>

      <PageSection
        title="Buyurtmalar"
        description="Yaratilgan buyurtma — yozuv; mijozga chiqish «Yetkazildi qilish» bilan bo‘ladi. To‘lov alohida."
      >
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setFeedback(null);
              createOrder.reset();
              setEditOrder(null);
              setIsCreateDrawerOpen(true);
            }}
          >
            Buyurtma yaratish
          </Button>
        </div>
        <OrdersTable orders={orders} onSelect={setSelectedOrder} />
      </PageSection>

      <OrderDetailsDrawer
        order={selectedOrder}
        isDelivering={deliverOrder.isPending}
        isReturning={returnDelivery.isPending}
        isCancelling={cancelOrder.isPending}
        onDeliver={(order) => {
          setFeedback(null);
          deliverOrder.reset();
          setDeliveryTarget(order);
        }}
        onEdit={(order) => {
          setFeedback(null);
          updateOrder.reset();
          setEditOrder(order);
        }}
        onCancel={(order) => {
          setFeedback(null);
          setCancelTarget(order);
        }}
        onReturnDelivery={(order) => {
          setFeedback(null);
          setReturnTarget(order);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setDeliveryTarget(null);
            setReturnTarget(null);
            setCancelTarget(null);
          }
        }}
      />

      <OrderCreateDrawer
        open={isCreateDrawerOpen}
        clients={clients}
        variants={variants}
        isSubmitting={createOrder.isPending}
        isOptionsLoading={clientsQuery.isPending || productsQuery.isPending}
        errorMessage={createError}
        onOpenChange={(open) => setIsCreateDrawerOpen(open)}
        onSubmit={async (payload: CreateSalesOrderPayload) => {
          setFeedback(null);
          await createOrder.mutateAsync(payload);
          setFeedback({
            tone: "success",
            message:
              "Buyurtma yozuvi yaratildi. Bu hali mijozga yetkazilgani emas.",
          });
          setIsCreateDrawerOpen(false);
        }}
      />

      <OrderCreateDrawer
        open={Boolean(editOrder)}
        order={editOrder}
        clients={clients}
        variants={variants}
        isSubmitting={updateOrder.isPending}
        isOptionsLoading={clientsQuery.isPending || productsQuery.isPending}
        errorMessage={updateError}
        onOpenChange={(open) => {
          if (!open) setEditOrder(null);
        }}
        onSubmit={async (payload: CreateSalesOrderPayload) => {
          if (!editOrder) return;
          setFeedback(null);
          await updateOrder.mutateAsync({ id: editOrder.id, payload });
          setFeedback({
            tone: "success",
            message: "Buyurtma yangilandi. Yakuniy summa tizim tomonidan saqlandi.",
          });
        }}
      />

      <DeliveryConfirmDrawer
        order={deliveryTarget}
        isSubmitting={deliverOrder.isPending}
        errorMessage={deliverError}
        onOpenChange={(open) => {
          if (!open) setDeliveryTarget(null);
        }}
        onConfirm={async (payload) => {
          if (!deliveryTarget) return;
          setFeedback(null);
          await deliverOrder.mutateAsync({
            id: deliveryTarget.id,
            payload,
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(returnTarget)}
        isPending={returnDelivery.isPending}
        errorMessage={
          returnDelivery.error instanceof Error
            ? returnDelivery.error.message
            : null
        }
        onOpenChange={(open) => {
          if (!open) setReturnTarget(null);
        }}
        title="Yetkazuvni qaytarish"
        description="Mahsulot Tayyor mahsulot zonasiga qaytadi. Mijoz to‘lovi avtomatik bekor qilinmaydi."
        confirmLabel="Qaytarish"
        onConfirm={async () => {
          if (returnTarget) await returnDelivery.mutateAsync(returnTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        isPending={cancelOrder.isPending}
        errorMessage={
          cancelOrder.error instanceof Error ? cancelOrder.error.message : null
        }
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Buyurtmani bekor qilish"
        description="Faqat yetkazilmagan buyurtma bekor qilinadi. Agar mijoz to‘lovi bog‘langan bo‘lsa, avval to‘lovni reverse qiling."
        confirmLabel="Bekor qilish"
        destructive
        onConfirm={async () => {
          if (cancelTarget) await cancelOrder.mutateAsync(cancelTarget.id);
        }}
      />
    </div>
  );
}

async function invalidateOrderQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.orders() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.summary() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.debts() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stock() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.stockSummary() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.movements() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.executiveSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.factoryTvSummary(),
    }),
  ]);
}
