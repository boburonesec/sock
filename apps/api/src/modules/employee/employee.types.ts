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
  stages: EmployeeStageResponse[];
  createdAt: Date;
  updatedAt: Date;
}
