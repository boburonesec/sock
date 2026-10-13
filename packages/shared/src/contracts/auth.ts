/** Tenant session contracts. Native is a credential transport, not a trusted role. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface AuthFactory {
  id: string;
  name: string;
}

export interface AuthContext {
  user: AuthUser;
  tenantId: string;
  branchMode: "SINGLE" | "MULTI";
  activeFactoryId: string | null;
  accessibleFactories: AuthFactory[];
  roles: string[];
  permissions: string[];
}

export interface AuthSession extends AuthContext {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
}

export interface NativeAuthSession extends AuthSession {
  refreshToken: string;
}

export interface NativeRefreshRequest {
  refreshToken: string;
}

/** A device preference, never proof of factory authorization. */
export interface FactoryPreference {
  tenantId: string;
  userId: string;
  factoryId: string | null;
}

/** Use only a freshly verified API context. Preserve the API's default/order. */
export function resolveSessionFactory(context: AuthContext, preference?: FactoryPreference | null): string | null {
  const allowed = (id: string | null) => id !== null && context.accessibleFactories.some((factory) => factory.id === id);
  if (preference?.tenantId === context.tenantId && preference.userId === context.user.id && allowed(preference.factoryId)) {
    return preference.factoryId;
  }
  if (allowed(context.activeFactoryId)) return context.activeFactoryId;
  return context.accessibleFactories[0]?.id ?? null;
}
