export interface RequestContext {
  userId: string;
  tenantId: string;
  activeFactoryId: string | null;
  accessibleFactoryIds: string[];
  roles: string[];
  permissions: string[];
}

export interface RequestWithContext {
  requestContext?: RequestContext;
}

