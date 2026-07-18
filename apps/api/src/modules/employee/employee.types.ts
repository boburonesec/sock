export interface CollectionResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}

export interface EmployeeStageResponse {
  id: string;
  name: string;
  sortOrder: number;
}

export interface EmployeeResponse {
  id: string;
  name: string;
  status: string;
  /** @deprecated compatibility field; new writes use workProfile. */
  jobRole: 'STAGE_WORKER' | 'MECHANIC' | 'MACHINE_OPERATOR';
  workProfile:
    | 'STAGE_WORKER'
    | 'MACHINE_OPERATOR'
    | 'MECHANIC'
    | 'MECHANIC_MASTER'
    | 'STAFF';
  compensationType: 'PIECE_RATE' | 'SALARIED';
  account: { id: string; email: string; roleNames: string[] } | null;
  salaryAgreement: {
    id: string;
    monthlyAmount: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  } | null;
  stages: EmployeeStageResponse[];
  workShift: {
    id: string;
    code: 'DAY' | 'NIGHT';
    name: string;
    startMinute: number;
    endMinute: number;
    premiumPerPiece: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}
