export interface RequestContext {
  userId: string;
  tenantId: string;
  branchMode: 'SINGLE' | 'MULTI';
  activeFactoryId: string | null;
  accessibleFactoryIds: string[];
  roles: string[];
  permissions: string[];
}

export interface RequestWithContext {
  requestContext?: RequestContext;
}
