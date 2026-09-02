import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FactoryTvRequest } from './factory-tv-access.guard';

/** Reads the {tenantId, factoryId} that FactoryTvAccessGuard resolved. */
export const CurrentFactoryTvContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<FactoryTvRequest>();

    return request.factoryTvContext;
  },
);
