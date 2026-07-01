import type { BotConfig } from './config';

export interface ApiCollection<T> {
  data: T[];
}

export interface ApiSingle<T> {
  data: T;
}

export interface LinkedAccount {
  telegramAccountId: string;
  tenantId: string;
  type: 'EMPLOYEE' | 'CLIENT';
  employee: {
    id: string;
    name: string;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
  linkedAt: string;
}

export interface AccountStatusChange {
  telegramAccountId: string;
  status: 'UNLINKED' | 'BLOCKED';
  changedAt: string;
}

export interface SalaryRate {
  id: string;
  amount: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  stage: { id: string; name: string };
  productVariant: { id: string; label: string } | null;
}

export interface WorkerActivity {
  id: string;
  quantity: number;
  salaryRateAmount: string;
  activityDate: string;
  stage: { id: string; name: string };
  productVariant: { id: string; label: string };
}

export interface Advance {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: string;
  paidAt: string | null;
}

export interface PayrollItem {
  id: string;
  month: string;
  status: string;
  workedAmount: string;
  bonusAmount: string;
  penaltyAmount: string;
  advanceAmount: string;
  finalAmount: string;
  paidAmount: string;
  remainingAmount: string;
}

export interface ClientOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  deadline: string | null;
  totalAmount: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    productVariant: { id: string; label: string };
  }>;
}

export interface ClientDebt {
  client: {
    id: string;
    name: string;
  };
  totalOrders: string;
  totalPaid: string;
  debt: string;
}

export interface ClientPayment {
  id: string;
  amount: string;
  method: string;
  paymentDate: string;
  note: string | null;
  allocations: Array<{
    id: string;
    amount: string;
    order: { id: string; orderNumber: string };
  }>;
}

export class BotApiClient {
  constructor(private readonly config: BotConfig) {}

  link(input: {
    code: string;
    telegramUserId: string;
    telegramChatId: string;
  }): Promise<ApiSingle<LinkedAccount>> {
    return this.request('/telegram/bot/link', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  me(telegramUserId: string): Promise<ApiSingle<LinkedAccount>> {
    return this.request(`/telegram/bot/me?${this.telegramUserQuery(telegramUserId)}`);
  }

  unlink(telegramUserId: string): Promise<ApiSingle<AccountStatusChange>> {
    return this.request('/telegram/bot/unlink', {
      method: 'POST',
      body: JSON.stringify({ telegramUserId }),
    });
  }

  salary(telegramUserId: string): Promise<ApiCollection<SalaryRate>> {
    return this.request(
      `/telegram/bot/employee/salary?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  activities(telegramUserId: string): Promise<ApiCollection<WorkerActivity>> {
    return this.request(
      `/telegram/bot/employee/activities?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  advances(telegramUserId: string): Promise<ApiCollection<Advance>> {
    return this.request(
      `/telegram/bot/employee/advances?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  payroll(telegramUserId: string): Promise<ApiCollection<PayrollItem>> {
    return this.request(
      `/telegram/bot/employee/payroll?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  clientOrders(telegramUserId: string): Promise<ApiCollection<ClientOrder>> {
    return this.request(
      `/telegram/bot/client/orders?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  clientDebt(telegramUserId: string): Promise<ApiSingle<ClientDebt>> {
    return this.request(
      `/telegram/bot/client/debt?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  clientPayments(telegramUserId: string): Promise<ApiCollection<ClientPayment>> {
    return this.request(
      `/telegram/bot/client/payments?${this.telegramUserQuery(telegramUserId)}`,
    );
  }

  private telegramUserQuery(telegramUserId: string): string {
    return new URLSearchParams({ telegramUserId }).toString();
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-bot-api-key': this.config.botInternalApiKey,
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new BotApiError(response.status, payload?.message ?? 'API request failed.');
    }

    return payload as T;
  }
}

export class BotApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
