import { RequestContext } from '../request-context/request-context.types';

export interface AuthenticatedUserResponse {
  id: string;
  name: string;
  email: string;
  status: string;
}

export interface AccessibleFactoryResponse {
  id: string;
  name: string;
}

export interface AuthMeResponse {
  data: {
    user: AuthenticatedUserResponse;
    tenantId: string;
    activeFactoryId: string | null;
    accessibleFactories: AccessibleFactoryResponse[];
    roles: string[];
    permissions: string[];
  };
}

export interface AuthLoginResponse extends AuthMeResponse {
  data: AuthMeResponse['data'] & {
    accessToken: string;
    accessTokenExpiresInSeconds: number;
  };
}

export interface JwtAccessPayload {
  sub: string;
  tenantId: string;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  context: RequestContext;
  me: AuthMeResponse['data'];
}

