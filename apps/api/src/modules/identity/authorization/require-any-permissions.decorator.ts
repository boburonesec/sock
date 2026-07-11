import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ANY_PERMISSIONS_KEY = 'paypoq:required-any-permissions';

/** User needs at least one of the listed permissions. */
export const RequireAnyPermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissions);
