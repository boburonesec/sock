import { ForbiddenException } from '@nestjs/common';
import { RequestContext } from './request-context.types';

export function requireActiveFactoryId(context: RequestContext): string {
  if (!context.activeFactoryId) {
    throw new ForbiddenException(
      'Bu amal uchun faol fabrika tanlanishi shart.',
    );
  }

  return context.activeFactoryId;
}
