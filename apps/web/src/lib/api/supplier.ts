import { apiClient } from "./client";
import {
  ApiCollection,
  ApiDateTime,
  NamedReference,
  UserReference,
} from "./types";

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: string;
}

export interface SupplierPayload {
  name: string;
  phone?: string | null;
  notes?: string | null;
}

export interface SupplierPurchaseItem {
  id: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  material: NamedReference;
}

export interface SupplierPurchase {
  id: string;
  purchaseNumber: string;
  totalAmount: string;
  paymentStatus: string;
  purchasedAt: ApiDateTime;
  cancelledAt: ApiDateTime | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  supplier: Supplier;
  createdBy: UserReference | null;
  items: SupplierPurchaseItem[];
}

export interface SupplierPayment {
  id: string;
  amount: string;
  method: string;
  paymentDate: ApiDateTime;
  note: string | null;
  createdAt: ApiDateTime;
  supplier: Supplier;
  recordedBy: UserReference | null;
  allocations: Array<{
    id: string;
    amount: string;
    purchase: { id: string; purchaseNumber: string };
  }>;
}

export interface SupplierDebt {
  supplier: Supplier;
  totalPurchases: string;
  totalPaid: string;
  debt: string;
}

export interface CreateSupplierPurchaseItemPayload {
  materialId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export interface CreateSupplierPurchasePayload {
  supplierId: string;
  purchaseDate?: string | null;
  note?: string | null;
  items: CreateSupplierPurchaseItemPayload[];
}

export interface CreateSupplierPaymentAllocationPayload {
  purchaseId: string;
  amount: string;
}

export interface CreateSupplierPaymentPayload {
  supplierId: string;
  amount: string;
  method: "CASH" | "TRANSFER" | "OTHER";
  paymentDate?: string | null;
  note?: string | null;
  allocations: CreateSupplierPaymentAllocationPayload[];
}

export const supplierApi = {
  getSuppliers: () =>
    apiClient<ApiCollection<Supplier>>("/supplier/suppliers"),
  createSupplier: (payload: SupplierPayload) =>
    apiClient<{ data: Supplier }>("/supplier/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  updateSupplier: (id: string, payload: SupplierPayload) =>
    apiClient<{ data: Supplier }>(`/supplier/suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  archiveSupplier: (id: string) =>
    apiClient<{ data: Supplier }>(`/supplier/suppliers/${id}/archive`, {
      method: "POST",
    }),
  getPurchases: () =>
    apiClient<ApiCollection<SupplierPurchase>>("/supplier/purchases"),
  createPurchase: (payload: CreateSupplierPurchasePayload) =>
    apiClient<{ data: SupplierPurchase }>("/supplier/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getPayments: () =>
    apiClient<ApiCollection<SupplierPayment>>("/supplier/payments"),
  createPayment: (payload: CreateSupplierPaymentPayload, idempotencyKey: string) =>
    apiClient<{ data: SupplierPayment }>("/supplier/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    }),
  getDebts: () =>
    apiClient<ApiCollection<SupplierDebt>>("/supplier/debts"),
};
