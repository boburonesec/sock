import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth/auth.controller';
import { AuthRateLimiterService } from './auth/auth-rate-limiter.service';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionGuard } from './authorization/permission.guard';
import { PlatformAuthController } from './platform-auth/platform-auth.controller';
import { PlatformAuthService } from './platform-auth/platform-auth.service';
import { PlatformJwtAuthGuard } from './platform-auth/platform-jwt-auth.guard';

/**
 * Owns user identity and local authentication concerns.
 * RBAC rollout to business modules is intentionally handled incrementally.
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuthController, PlatformAuthController],
  providers: [
    AuthService,
    AuthRateLimiterService,
    JwtAuthGuard,
    PermissionGuard,
    PlatformAuthService,
    PlatformJwtAuthGuard,
  ],
  exports: [
    AuthService,
    AuthRateLimiterService,
    JwtAuthGuard,
    PermissionGuard,
    PlatformAuthService,
    PlatformJwtAuthGuard,
  ],
})
export class IdentityModule {}
