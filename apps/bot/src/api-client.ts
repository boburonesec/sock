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
  type: 'EMPLOYEE' | 'CLIENT' | 'USER';
  employee: {
    id: string;
    name: string;
  } | null;
  client: {
    id: string;
    name: string;
  } | null;
  user: { id: string; name: string } | null;
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

export interface NotificationDelivery {
  id: string;
  chatId: string | null;
  title: string;
  body: string;
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

  claimNotificationDeliveries(): Promise<ApiCollection<NotificationDelivery>> {
    return this.request('/internal/notification-deliveries/claim', { method: 'POST' });
  }

  acknowledgeNotificationDelivery(id: string, status: 'SENT' | 'FAILED', error?: string): Promise<ApiSingle<unknown>> {
    return this.request(`/internal/notification-deliveries/${id}/ack`, {
      method: 'POST', body: JSON.stringify({ status, error }),
    });
  }

  private telegramUserQuery(telegramUserId: string): string {
    return new URLSearchParams({ telegramUserId }).toString();
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    // A hung API must not freeze command handlers or the delivery worker loop.
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      ...init,
      signal: AbortSignal.timeout(this.config.apiRequestTimeoutMs),
      headers: {
        'content-type': 'application/json',
        'x-bot-api-key': this.config.botInternalApiKey,
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const payload = parseJson(text);

    if (!response.ok) {
      const message = typeof payload?.message === 'string' ? payload.message : 'API request failed.';
      throw new BotApiError(response.status, message);
    }

    return payload as T;
  }
}

// Proxies return HTML error pages (502/504); never let that surface as a SyntaxError.
function parseJson(text: string): { message?: unknown } | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as { message?: unknown };
  } catch {
    return null;
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
