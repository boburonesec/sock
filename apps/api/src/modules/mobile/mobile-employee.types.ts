export interface MobileEmployeeMeResponse {
  data: {
    employee: {
      id: string;
      name: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    };
    factory: {
      id: string;
      name: string;
    };
    tenant: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
      status: string;
    };
  };
}

export interface MobileEmployeeActivitiesResponse {
  data: Array<{
    id: string;
    quantity: number;
    salaryRateAmount: string;
    activityDate: Date;
    stage: {
      id: string;
      name: string;
      sortOrder: number;
    };
    productVariant: {
      id: string;
      label: string;
      product: {
        id: string;
        name: string;
        code: string | null;
      };
      color: {
        id: string;
        name: string;
        code: string | null;
      };
      material: {
        id: string;
        name: string;
        code: string | null;
      };
      season: {
        id: string;
        name: string;
        code: string | null;
      };
    };
  }>;
}

export interface MobileEmployeePayrollResponse {
  data: Array<{
    id: string;
    month: Date;
    payrollPeriodStatus: string;
    status: string;
    workedAmount: string;
    bonusAmount: string;
    penaltyAmount: string;
    advanceAmount: string;
    finalAmount: string;
    paidAmount: string;
    remainingAmount: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface MobileEmployeeAdvancesResponse {
  data: Array<{
    id: string;
    amount: string;
    reason: string;
    status: string;
    requestedAt: Date;
    approvedAt: Date | null;
    paidAt: Date | null;
    cancelledAt: Date | null;
    payrollPeriod: {
      id: string;
      month: Date;
      status: string;
    } | null;
  }>;
}

