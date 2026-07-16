import { TelegramAccountType } from '@prisma/client';

export interface TelegramLinkTokenCreatedResponse {
  id: string;
  code: string;
  targetType: TelegramAccountType;
  targetId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface TelegramLinkTokenListItem {
  id: string;
  targetType: TelegramAccountType;
  targetId: string | null;
  targetName: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  createdByUserId: string | null;
}

export interface TelegramAccountListItem {
  id: string;
  type: TelegramAccountType;
  linkedEntity: {
    id: string;
    name: string;
    type: 'EMPLOYEE' | 'CLIENT' | 'USER';
  } | null;
  telegramUserIdMasked: string;
  status: string;
  linkedAt: Date;
  unlinkedAt: Date | null;
  blockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelegramHealthResponse {
  status: 'ok';
  service: 'paypoq-os-telegram';
  checks: {
    botInternalApiKeyConfigured: boolean;
    linkTokenSecretConfigured: boolean;
    database: 'ok';
  };
  counts: {
    accounts: string;
    activeAccounts: string;
    linkTokens: string;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface CollectionResponse<T> {
  data: T[];
}

export interface TelegramBotLinkedAccountResponse {
  telegramAccountId: string;
  tenantId: string;
  type: 'EMPLOYEE' | 'CLIENT' | 'USER';
  employee: {
    id: string;
    name: string;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
  user: {
    id: string;
    name: string;
  } | null;
  linkedAt: Date;
}

export interface TelegramAccountStatusChangeResponse {
  telegramAccountId: string;
  status: 'UNLINKED' | 'BLOCKED';
  changedAt: Date;
}

export interface TelegramBotSalaryRateResponse {
  id: string;
  amount: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  stage: {
    id: string;
    name: string;
  };
  productVariant: {
    id: string;
    label: string;
  } | null;
}

export interface TelegramBotWorkerActivityResponse {
  id: string;
  quantity: number;
  salaryRateAmount: string;
  activityDate: Date;
  stage: {
    id: string;
    name: string;
  };
  productVariant: {
    id: string;
    label: string;
  };
}

export interface TelegramBotAdvanceResponse {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: Date;
  paidAt: Date | null;
}

export interface TelegramBotPayrollItemResponse {
  id: string;
  month: Date;
  status: string;
  workedAmount: string;
  bonusAmount: string;
  penaltyAmount: string;
  advanceAmount: string;
  finalAmount: string;
  paidAmount: string;
  remainingAmount: string;
}

export interface TelegramBotClientOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deadline: Date | null;
  totalAmount: string;
  createdAt: Date;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    productVariant: {
      id: string;
      label: string;
    };
  }>;
}

export interface TelegramBotClientDebtResponse {
  client: {
    id: string;
    name: string;
  };
  totalOrders: string;
  totalPaid: string;
  debt: string;
}

export interface TelegramBotClientPaymentResponse {
  id: string;
  amount: string;
  method: string;
  paymentDate: Date;
  note: string | null;
  allocations: Array<{
    id: string;
    amount: string;
    order: {
      id: string;
      orderNumber: string;
    };
  }>;
}
