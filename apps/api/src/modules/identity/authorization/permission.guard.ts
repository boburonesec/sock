import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RequestWithContext } from '../request-context/request-context.types';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithContext>();
    const requestContext = request.requestContext;

    if (!requestContext) {
      throw new ForbiddenException(
        'So‘rov konteksti topilmadi. Qayta kiring.',
      );
    }

    const grantedPermissions = new Set(requestContext.permissions);
    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );

    if (!hasAllRequiredPermissions) {
      throw new ForbiddenException('Bu amal uchun ruxsatingiz yo‘q.');
    }

    return true;
  }
}
