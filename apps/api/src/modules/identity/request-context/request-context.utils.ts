import { ForbiddenException } from '@nestjs/common';
import { RequestContext } from './request-context.types';

export function requireActiveFactoryId(context: RequestContext): string {
  if (!context.activeFactoryId) {
    throw new ForbiddenException('Active factory is required for this endpoint.');
  }

  return context.activeFactoryId;
}
