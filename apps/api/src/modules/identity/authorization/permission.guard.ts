import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RequestWithContext } from '../request-context/request-context.types';
import { REQUIRED_ANY_PERMISSIONS_KEY } from './require-any-permissions.decorator';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredAll =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const requiredAny =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_ANY_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredAll.length === 0 && requiredAny.length === 0) {
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

    if (requiredAll.length > 0) {
      const hasAll = requiredAll.every((permission) =>
        grantedPermissions.has(permission),
      );
      if (!hasAll) {
        throw new ForbiddenException('Bu amal uchun ruxsatingiz yo‘q.');
      }
    }

    if (requiredAny.length > 0) {
      const hasAny = requiredAny.some((permission) =>
        grantedPermissions.has(permission),
      );
      if (!hasAny) {
        throw new ForbiddenException('Bu amal uchun ruxsatingiz yo‘q.');
      }
    }

    return true;
  }
}
