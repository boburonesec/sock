import { apiClient } from "./client";
import {
  ApiCollection,
  ApiDateTime,
  NamedReference,
  UserReference,
} from "./types";

export interface Expense {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: ApiDateTime;
  approvedAt: ApiDateTime | null;
  paidAt: ApiDateTime | null;
  cancelledAt: ApiDateTime | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  category: NamedReference;
  requestedBy: UserReference | null;
  approvedBy: UserReference | null;
  paidBy: UserReference | null;
}

export interface Advance {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: ApiDateTime;
  approvedAt: ApiDateTime | null;
  paidAt: ApiDateTime | null;
  cancelledAt: ApiDateTime | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  employee: {
    id: string;
    name: string;
    status: string;
  };
  payrollPeriod: {
    id: string;
    month: ApiDateTime;
    status: string;
  } | null;
  requestedBy: UserReference | null;
  approvedBy: UserReference | null;
  paidBy: UserReference | null;
}

export interface PayrollPeriod {
  id: string;
  month: ApiDateTime;
  status: string;
  totalWorkedAmount: string;
  totalBonusAmount: string;
  totalPenaltyAmount: string;
  totalAdvanceAmount: string;
  totalFinalAmount: string;
  totalPaidAmount: string;
  totalRemainingAmount: string;
  calculatedAt: ApiDateTime | null;
  closedAt: ApiDateTime | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
}

export interface PayrollItem {
  id: string;
  workedAmount: string;
  bonusAmount: string;
  penaltyAmount: string;
  advanceAmount: string;
  finalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  calculationSnapshot: unknown | null;
  createdAt: ApiDateTime;
  updatedAt: ApiDateTime;
  employee: {
    id: string;
    name: string;
    status: string;
  };
}

export interface PayrollPayment {
  id: string;
  amount: string;
  method: string;
  paidAt: ApiDateTime;
  note: string | null;
  createdAt: ApiDateTime;
  payrollItem: {
    id: string;
    employee: {
      id: string;
      name: string;
      status: string;
    };
  };
  paidBy: UserReference | null;
}

export interface CreatePayrollPeriodPayload {
  month: string;
}

export interface CreateEmployeeAdjustmentPayload {
  employeeId: string;
  amount: string;
  reason: string;
}

export interface PayPayrollPeriodPayload {
  payrollItemId: string;
  amount: string;
  method: "CASH" | "TRANSFER" | "OTHER";
  paidAt?: string | null;
  note?: string | null;
}

export interface FinanceSummary {
  kpis: {
    monthlyExpenses: string;
    pendingExpenses: string;
    pendingAdvances: string;
    payrollRemaining: string;
  };
  recentExpenses: Expense[];
  recentAdvances: Advance[];
  payrollPeriods: PayrollPeriod[];
}

export interface CreateExpensePayload {
  categoryId: string;
  amount: string;
  reason: string;
}

export const financeApi = {
  getSummary: () => apiClient<{ data: FinanceSummary }>("/finance/summary"),
  getExpenses: () => apiClient<ApiCollection<Expense>>("/finance/expenses"),
  createExpense: (payload: CreateExpensePayload) =>
    apiClient<{ data: Expense }>("/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  approveExpense: (expenseId: string) =>
    apiClient<{ data: Expense }>(
      `/finance/expenses/${encodeURIComponent(expenseId)}/approve`,
      { method: "POST" },
    ),
  rejectExpense: (expenseId: string) =>
    apiClient<{ data: Expense }>(
      `/finance/expenses/${encodeURIComponent(expenseId)}/reject`,
      { method: "POST" },
    ),
  payExpense: (expenseId: string) =>
    apiClient<{ data: Expense }>(
      `/finance/expenses/${encodeURIComponent(expenseId)}/pay`,
      { method: "POST" },
    ),
  cancelExpense: (expenseId: string) =>
    apiClient<{ data: Expense }>(
      `/finance/expenses/${encodeURIComponent(expenseId)}/cancel`,
      { method: "POST" },
    ),
  getAdvances: () => apiClient<ApiCollection<Advance>>("/finance/advances"),
  getBonuses: () => apiClient<ApiCollection<Advance>>("/finance/bonuses"),
  getPenalties: () => apiClient<ApiCollection<Advance>>("/finance/penalties"),
  getPayrollPeriods: () =>
    apiClient<ApiCollection<PayrollPeriod>>("/finance/payroll-periods"),
  createPayrollPeriod: (payload: CreatePayrollPeriodPayload) =>
    apiClient<{ data: PayrollPeriod }>("/finance/payroll-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  calculatePayrollPeriod: (payrollPeriodId: string) =>
    apiClient<{ data: PayrollPeriod }>(
      `/finance/payroll-periods/${encodeURIComponent(payrollPeriodId)}/calculate`,
      { method: "POST" },
    ),
  closePayrollPeriod: (payrollPeriodId: string) =>
    apiClient<{ data: PayrollPeriod }>(
      `/finance/payroll-periods/${encodeURIComponent(payrollPeriodId)}/close`,
      { method: "POST" },
    ),
  payPayrollPeriod: (
    payrollPeriodId: string,
    payload: PayPayrollPeriodPayload,
  ) =>
    apiClient<{ data: PayrollPayment }>(
      `/finance/payroll-periods/${encodeURIComponent(payrollPeriodId)}/pay`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    ),
  getPayrollPeriodItems: (payrollPeriodId: string) =>
    apiClient<ApiCollection<PayrollItem>>(
      `/finance/payroll-periods/${encodeURIComponent(payrollPeriodId)}/items`,
    ),
  createAdvance: (payload: CreateEmployeeAdjustmentPayload) =>
    apiClient<{ data: Advance }>("/finance/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  approveAdvance: (advanceId: string) =>
    apiClient<{ data: Advance }>(
      `/finance/advances/${encodeURIComponent(advanceId)}/approve`,
      { method: "POST" },
    ),
  rejectAdvance: (advanceId: string) =>
    apiClient<{ data: Advance }>(
      `/finance/advances/${encodeURIComponent(advanceId)}/reject`,
      { method: "POST" },
    ),
  payAdvance: (advanceId: string) =>
    apiClient<{ data: Advance }>(
      `/finance/advances/${encodeURIComponent(advanceId)}/pay`,
      { method: "POST" },
    ),
  createBonus: (payload: CreateEmployeeAdjustmentPayload) =>
    apiClient<{ data: Advance }>("/finance/bonuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createPenalty: (payload: CreateEmployeeAdjustmentPayload) =>
    apiClient<{ data: Advance }>("/finance/penalties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
