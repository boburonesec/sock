import { apiClient } from "./client";
import {
  ApiCollection,
  ApiDateTime,
  NamedReference,
  ProductVariantReference,
  UserReference,
} from "./types";

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
}

export interface ClientPayload {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface SalesOrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productVariant: ProductVariantReference;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: string;
  deadline: ApiDateTime | null;
  totalAmount: string;
  paymentStatus: string;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  cancelledAt: ApiDateTime | null;
  closedAt: ApiDateTime | null;
  client: Client;
  createdBy: UserReference | null;
  items: SalesOrderItem[];
}

export interface CreateSalesOrderItemPayload {
  productVariantId: string;
  quantity: number;
  unitPrice?: string | null;
}

export interface CreateSalesOrderPayload {
  clientId: string;
  deadline?: string | null;
  note?: string | null;
  items: CreateSalesOrderItemPayload[];
}

export type UpdateSalesOrderPayload = CreateSalesOrderPayload;

export interface DeliverSalesOrderPayload {
  /** Factory logistics/courier cost — recorded as paid expense, not client payment. */
  deliveryCost?: string | null;
  deliveryCostNote?: string | null;
}

export interface ClientPayment {
  id: string;
  amount: string;
  method: string;
  paymentDate: ApiDateTime;
  note: string | null;
  reversedAt: ApiDateTime | null;
  reversalReason: string | null;
  createdAt: ApiDateTime;
  client: Client;
  recordedBy: UserReference | null;
  reversedBy: UserReference | null;
  allocations: Array<{
    id: string;
    amount: string;
    order: { id: string; orderNumber: string };
  }>;
}

export interface CreateClientPaymentAllocationPayload {
  orderId: string;
  amount: string;
}

export interface CreateClientPaymentPayload {
  clientId: string;
  amount: string;
  method: "CASH" | "TRANSFER" | "OTHER";
  paymentDate?: string | null;
  note?: string | null;
  allocations: CreateClientPaymentAllocationPayload[];
}

export interface ReverseClientPaymentPayload {
  reason: string;
}

export interface ClientDebt {
  client: Client;
  totalOrders: string;
  totalPaid: string;
  debt: string;
}

export interface SalesSummary {
  kpis: {
    clientCount: string;
    activeOrderCount: string;
    monthlySales: string;
    totalClientDebt: string;
  };
  topClients: Array<{
    client: Client;
    totalOrders: string;
    totalPaid: string;
    debt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    client: Client;
    status: string;
    totalAmount: string;
    paymentStatus: string;
    createdAt: ApiDateTime;
  }>;
}

export const salesApi = {
  getSummary: () => apiClient<{ data: SalesSummary }>("/sales/summary"),
  getClients: () => apiClient<ApiCollection<Client>>("/sales/clients"),
  createClient: (payload: ClientPayload) =>
    apiClient<{ data: Client }>("/sales/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateClient: (id: string, payload: ClientPayload) =>
    apiClient<{ data: Client }>(`/sales/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveClient: (id: string) =>
    apiClient<{ data: Client }>(`/sales/clients/${id}/archive`, {
      method: "POST",
    }),
  getOrders: () => apiClient<ApiCollection<SalesOrder>>("/sales/orders"),
  createOrder: (payload: CreateSalesOrderPayload) =>
    apiClient<{ data: SalesOrder }>("/sales/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateOrder: (id: string, payload: UpdateSalesOrderPayload) =>
    apiClient<{ data: SalesOrder }>(`/sales/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  cancelOrder: (id: string) =>
    apiClient<{ data: SalesOrder }>(`/sales/orders/${id}/cancel`, {
      method: "POST",
    }),
  deliverOrder: (id: string, payload: DeliverSalesOrderPayload = {}) =>
    apiClient<{ data: SalesOrder }>(`/sales/orders/${id}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  returnDelivery: (id: string) =>
    apiClient<{ data: SalesOrder }>(`/sales/orders/${id}/return-delivery`, {
      method: "POST",
    }),
  getPayments: () =>
    apiClient<ApiCollection<ClientPayment>>("/sales/payments"),
  createPayment: (payload: CreateClientPaymentPayload) =>
    apiClient<{ data: ClientPayment }>("/sales/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  reversePayment: (id: string, payload: ReverseClientPaymentPayload) =>
    apiClient<{ data: ClientPayment }>(`/sales/payments/${id}/reverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getDebts: () => apiClient<ApiCollection<ClientDebt>>("/sales/debts"),
};
