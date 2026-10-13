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
