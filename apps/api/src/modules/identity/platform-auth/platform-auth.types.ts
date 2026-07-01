export interface PlatformAdminContext {
  platformAdminId: string;
  email: string;
  name: string;
  status: string;
}

export interface RequestWithPlatformAdmin {
  platformAdminContext?: PlatformAdminContext;
}

export interface PlatformJwtAccessPayload {
  sub: string;
  type: 'platform';
}

export interface PlatformAuthSessionResult {
  accessToken: string;
  refreshToken: string;
  me: PlatformAdminContext;
}
