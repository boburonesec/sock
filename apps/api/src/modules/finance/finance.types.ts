export interface CollectionResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}

export interface NamedReferenceResponse {
  id: string;
  name: string;
}

export interface UserReferenceResponse extends NamedReferenceResponse {}

export interface ExpenseResponse {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category: NamedReferenceResponse;
  requestedBy: UserReferenceResponse | null;
  approvedBy: UserReferenceResponse | null;
  paidBy: UserReferenceResponse | null;
}

export interface AdvanceResponse {
  id: string;
  amount: string;
  reason: string;
  status: string;
  requestedAt: Date;
  approvedAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  employee: {
    id: string;
    name: string;
    status: string;
  };
  payrollPeriod: {
    id: string;
    month: Date;
    status: string;
  } | null;
  requestedBy: UserReferenceResponse | null;
  approvedBy: UserReferenceResponse | null;
  paidBy: UserReferenceResponse | null;
}

export interface PayrollPeriodResponse {
  id: string;
  month: Date;
  status: string;
  totalWorkedAmount: string;
  totalBonusAmount: string;
  totalPenaltyAmount: string;
  totalAdvanceAmount: string;
  totalFinalAmount: string;
  totalPaidAmount: string;
  totalRemainingAmount: string;
  calculatedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollItemResponse {
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
  createdAt: Date;
  updatedAt: Date;
  employee: {
    id: string;
    name: string;
    status: string;
  };
}

export interface PayrollPaymentResponse {
  id: string;
  amount: string;
  method: string;
  paidAt: Date;
  note: string | null;
  createdAt: Date;
  payrollItem: {
    id: string;
    employee: {
      id: string;
      name: string;
      status: string;
    };
  };
  paidBy: UserReferenceResponse | null;
}

export interface FinanceSummaryResponse {
  data: {
    kpis: {
      monthlyExpenses: string;
      pendingExpenses: string;
      pendingAdvances: string;
      payrollRemaining: string;
    };
    recentExpenses: ExpenseResponse[];
    recentAdvances: AdvanceResponse[];
    payrollPeriods: PayrollPeriodResponse[];
  };
}
