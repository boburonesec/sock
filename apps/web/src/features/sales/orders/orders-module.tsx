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
import { salesApi, type CreateSalesOrderPayload, type SalesOrder } from "@/lib/api/sales";
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
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const createOrder = useMutation({
    mutationFn: salesApi.createOrder,
    onSuccess: () => invalidateOrderQueries(queryClient),
  });
  const deliverOrder = useMutation({
    mutationFn: salesApi.deliverOrder,
    onSuccess: async (response) => {
      setSelectedOrder(response.data);
      setDeliveryTarget(null);
      setFeedback({
        tone: "success",
        message: "Buyurtma yetkazildi. Ombor stock tizim tomonidan kamaytirildi.",
      });
      await invalidateOrderQueries(queryClient);
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
          "Delivery return qilindi. Stock qaytarildi, to‘lov holati o‘zgarmadi.",
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
        description="Mijozlar buyurtma yaratmaydi; buyurtmalar sotuvchilar tomonidan kiritiladi."
      >
        <div className="mb-4 flex justify-end">
          <Button
            onClick={() => {
              setFeedback(null);
              createOrder.reset();
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
        onDeliver={(order) => {
          setFeedback(null);
          setDeliveryTarget(order);
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
            message: "Buyurtma yaratildi. Yakuniy summa tizim tomonidan saqlandi.",
          });
          setIsCreateDrawerOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(deliveryTarget)}
        onOpenChange={(open) => {
          if (!open) setDeliveryTarget(null);
        }}
        title="Buyurtmani yetkazildi qilish"
        description="Bu amal buyurtma mahsulotlarini Finished Products zonasidan kamaytiradi va harakatlar tarixiga yozadi."
        confirmLabel="Yetkazildi qilish"
        onConfirm={() => {
          if (deliveryTarget) deliverOrder.mutate(deliveryTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(returnTarget)}
        onOpenChange={(open) => {
          if (!open) setReturnTarget(null);
        }}
        title="Delivery return qilish"
        description="Bu amal buyurtma mahsulotlarini Finished Products zonasiga qaytaradi va RETURN harakatlar tarixiga yozadi. To‘lov avtomatik bekor qilinmaydi."
        confirmLabel="Return qilish"
        onConfirm={() => {
          if (returnTarget) returnDelivery.mutate(returnTarget.id);
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
