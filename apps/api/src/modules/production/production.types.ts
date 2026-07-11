export interface CollectionResponse<T> {
  data: T[];
}

export interface ProductVariantReferenceResponse {
  id: string;
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
}

export interface ProductionStageReferenceResponse {
  id: string;
  name: string;
  sortOrder: number;
}

export interface EmployeeReferenceResponse {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface UserReferenceResponse {
  id: string;
  name: string;
}

export interface StageInventoryResponse {
  id: string;
  quantity: number;
  stage: ProductionStageReferenceResponse;
  productVariant: ProductVariantReferenceResponse;
  updatedAt: Date;
}

export interface ProductionBatchResponse {
  id: string;
  quantity: number;
  createdAt: Date;
  productVariant: ProductVariantReferenceResponse;
  createdBy: UserReferenceResponse;
}

export interface StageMovementResponse {
  id: string;
  quantity: number;
  occurredAt: Date;
  note: string | null;
  sourceStage: ProductionStageReferenceResponse;
  destinationStage: ProductionStageReferenceResponse;
  productVariant: ProductVariantReferenceResponse;
  productionBatch: {
    id: string;
    quantity: number;
  } | null;
  recordedBy: UserReferenceResponse;
}

export interface ProductionBatchCreationResponse {
  data: {
    batch: ProductionBatchResponse;
    stageInventory: StageInventoryResponse;
    stageMovement: StageMovementResponse;
  };
}

export interface StageMovementCreationResponse {
  data: {
    sourceStageInventory: StageInventoryResponse;
    destinationStageInventory: StageInventoryResponse;
    stageMovement: StageMovementResponse;
    workerActivityCount?: number;
  };
}

export interface WorkerActivityCreationResponse {
  data: WorkerActivityResponse;
}

export interface DefectCreationResponse {
  data: DefectResponse;
}

export interface WorkerActivityResponse {
  id: string;
  quantity: number;
  salaryRateAmount: string;
  activityDate: Date;
  employee: EmployeeReferenceResponse;
  stage: ProductionStageReferenceResponse;
  productVariant: ProductVariantReferenceResponse;
  enteredBy: UserReferenceResponse;
}

export interface DefectResponse {
  id: string;
  quantity: number;
  reason: string;
  detectedAt: Date;
  employee: EmployeeReferenceResponse | null;
  stage: ProductionStageReferenceResponse | null;
  productVariant: ProductVariantReferenceResponse | null;
  reportedBy: UserReferenceResponse;
}

export type OperationsStageStatus = 'NORMAL' | 'ATTENTION' | 'HIGH';
export type OperationsBottleneckPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ProductionOperationsSummaryResponse {
  data: {
    kpis: {
      todayProduction: string;
      totalInProgress: string;
      busiestStageName: string | null;
      activeWorkers: string;
    };
    stageTotals: Array<{
      stageId: string;
      stageName: string;
      sortOrder: number;
      quantity: string;
      status: OperationsStageStatus;
      isHighQuantity: boolean;
    }>;
    bottlenecks: Array<{
      stageId: string;
      stageName: string;
      quantity: string;
      priority: OperationsBottleneckPriority;
    }>;
    topWorkers: Array<{
      employeeId: string;
      employeeName: string;
      stageName: string;
      quantity: string;
      amount: string;
    }>;
    trend: Array<{
      date: string;
      quantity: string;
    }>;
    attention: string[];
  };
}
