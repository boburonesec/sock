export interface CollectionResponse<T> {
  data: T[];
}

export interface ClientResponse {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
}

export interface NamedReferenceResponse {
  id: string;
  name: string;
}

export interface ProductVariantReferenceResponse {
  id: string;
  product: NamedReferenceResponse;
  color: NamedReferenceResponse;
  material: NamedReferenceResponse;
  season: NamedReferenceResponse;
}

export interface SalesOrderItemResponse {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  productVariant: ProductVariantReferenceResponse;
}

export interface SalesOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  deadline: Date | null;
  totalAmount: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  closedAt: Date | null;
  client: ClientResponse;
  createdBy: NamedReferenceResponse | null;
  items: SalesOrderItemResponse[];
}

export interface ClientPaymentResponse {
  id: string;
  amount: string;
  method: string;
  paymentDate: Date;
  note: string | null;
  reversedAt: Date | null;
  reversalReason: string | null;
  createdAt: Date;
  client: ClientResponse;
  recordedBy: NamedReferenceResponse | null;
  reversedBy: NamedReferenceResponse | null;
  allocations: Array<{
    id: string;
    amount: string;
    order: {
      id: string;
      orderNumber: string;
    };
  }>;
}

/**
 * A backend-calculated, non-persisted client debt projection. Monetary values
 * are serialized as strings to preserve the database Decimal precision.
 */
export interface ClientDebtResponse {
  client: ClientResponse;
  totalOrders: string;
  totalPaid: string;
  debt: string;
}

export interface SalesSummaryResponse {
  data: {
    kpis: {
      clientCount: string;
      activeOrderCount: string;
      monthlySales: string;
      totalClientDebt: string;
    };
    topClients: Array<{
      client: ClientResponse;
      totalOrders: string;
      totalPaid: string;
      debt: string;
    }>;
    recentOrders: Array<{
      id: string;
      orderNumber: string;
      client: ClientResponse;
      status: string;
      totalAmount: string;
      paymentStatus: string;
      createdAt: Date;
    }>;
  };
}
