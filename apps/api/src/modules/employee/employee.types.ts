export interface CollectionResponse<T> {
  data: T[];
}

export interface SingleResponse<T> {
  data: T;
}

export interface EmployeeResponse {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
