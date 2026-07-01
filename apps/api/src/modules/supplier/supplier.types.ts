export interface CollectionResponse<T> {
  data: T[];
}

export interface SupplierResponse {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: string;
}

export interface NamedReferenceResponse {
  id: string;
  name: string;
}

export interface SupplierPurchaseItemResponse {
  id: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  material: NamedReferenceResponse;
}

export interface SupplierPurchaseResponse {
  id: string;
  purchaseNumber: string;
  totalAmount: string;
  paymentStatus: string;
  purchasedAt: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: SupplierResponse;
  createdBy: NamedReferenceResponse | null;
  items: SupplierPurchaseItemResponse[];
}

export interface SupplierPaymentResponse {
  id: string;
  amount: string;
  method: string;
  paymentDate: Date;
  note: string | null;
  createdAt: Date;
  supplier: SupplierResponse;
  recordedBy: NamedReferenceResponse | null;
  allocations: Array<{
    id: string;
    amount: string;
    purchase: {
      id: string;
      purchaseNumber: string;
    };
  }>;
}

/**
 * A backend-calculated, non-persisted supplier debt projection. Monetary
 * values are serialized as strings to preserve Decimal precision.
 */
export interface SupplierDebtResponse {
  supplier: SupplierResponse;
  totalPurchases: string;
  totalPaid: string;
  debt: string;
}
