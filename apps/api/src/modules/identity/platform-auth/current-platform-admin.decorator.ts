import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import {
  PlatformAdminContext,
  RequestWithPlatformAdmin,
} from './platform-auth.types';

export const CurrentPlatformAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PlatformAdminContext | undefined => {
    const request = context.switchToHttp().getRequest<Request & RequestWithPlatformAdmin>();

    return request.platformAdminContext;
  },
);
