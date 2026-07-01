import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestWithContext } from './request-context.types';

export const CurrentContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request & RequestWithContext>();

    return request.requestContext;
  },
);

