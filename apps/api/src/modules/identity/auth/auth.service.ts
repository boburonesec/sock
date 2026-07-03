import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequestContext } from '../request-context/request-context.types';
import {
  AuthMeResponse,
  AuthSessionResult,
  JwtAccessPayload,
} from './auth.types';
import { AuthRateLimiterService } from './auth-rate-limiter.service';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const BLOCKED_TENANT_MESSAGE = 'Tenant is not active.';
const ALLOWED_TENANT_STATUSES = ['ACTIVE', 'PILOT'] as const;
const LOGIN_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 10 * 60 * 1000,
};
const REFRESH_RATE_LIMIT = {
  maxAttempts: 60,
  windowMs: 10 * 60 * 1000,
};

type TenantAuthAuditUser = {
  id: string;
  tenantId: string;
  email: string;
  tenant: {
    status: string;
    deletedAt: Date | null;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authRateLimiter: AuthRateLimiterService,
  ) {}

  async login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<AuthSessionResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const rateLimitKey = this.buildRateLimitKey('tenant-login', normalizedEmail, ipAddress);
    const rateLimit = this.authRateLimiter.consume(
      rateLimitKey,
      LOGIN_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      const auditUser = await this.findSingleUserForAuthAudit(normalizedEmail);
      await this.recordBlockedLogin(auditUser, 'RATE_LIMITED_LOGIN', userAgent, ipAddress, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      throw new HttpException(
        `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const users = await this.prisma.user.findMany({
      where: {
        email: normalizedEmail,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        credential: true,
        tenant: {
          select: {
            status: true,
            deletedAt: true,
          },
        },
      },
      take: 2,
    });

    const user = users[0];
    const credential = user?.credential;
    if (users.length !== 1 || !user || !credential) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.assertTenantCanAuthenticate(user, userAgent, ipAddress);

    const isPasswordValid = await argon2.verify(credential.passwordHash, password);

    if (!isPasswordValid) {
      await this.recordBlockedLogin(user, 'INVALID_PASSWORD', userAgent, ipAddress);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    this.authRateLimiter.reset(rateLimitKey);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return this.createSession(user.id, undefined, userAgent, ipAddress);
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthSessionResult> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const rateLimitKey = this.buildRateLimitKey('tenant-refresh', tokenHash, ipAddress);
    const rateLimit = this.authRateLimiter.consume(
      rateLimitKey,
      REFRESH_RATE_LIMIT,
    );

    if (!rateLimit.allowed) {
      await this.recordBlockedRefresh(tokenHash, 'RATE_LIMITED_REFRESH', userAgent, ipAddress, {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      throw new HttpException(
        `Too many refresh attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const now = new Date();
    const existingSession = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            tenant: {
              select: {
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (
      !existingSession ||
      existingSession.revokedAt ||
      existingSession.expiresAt <= now ||
      existingSession.user.deletedAt ||
      existingSession.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid refresh session.');
    }

    await this.assertTenantCanAuthenticate(existingSession.user, userAgent, ipAddress);

    const nextRefreshToken = this.createOpaqueRefreshToken();
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
    const expiresAt = this.getRefreshExpiresAt();

    await this.prisma.$transaction([
      this.prisma.refreshSession.update({
        where: { id: existingSession.id },
        data: { revokedAt: now },
      }),
      this.prisma.refreshSession.create({
        data: {
          tenantId: existingSession.tenantId,
          userId: existingSession.userId,
          tokenHash: nextRefreshTokenHash,
          userAgent,
          ipAddress,
          expiresAt,
        },
      }),
    ]);

    this.authRateLimiter.reset(rateLimitKey);

    const context = await this.buildRequestContext(existingSession.userId);

    return {
      accessToken: this.signAccessToken(existingSession.userId, existingSession.tenantId),
      refreshToken: nextRefreshToken,
      context,
      me: await this.buildMeResponse(context),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.prisma.refreshSession.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async getContextFromAccessToken(accessToken: string, requestedFactoryId?: string): Promise<RequestContext> {
    const payload = this.verifyAccessToken(accessToken);

    return this.buildRequestContext(payload.sub, requestedFactoryId);
  }

  async buildMeResponse(context: RequestContext): Promise<AuthMeResponse['data']> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: context.userId,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        status: true,
        deletedAt: true,
        factoryAccesses: {
          where: {
            tenantId: context.tenantId,
            factory: {
              deletedAt: null,
            },
          },
          select: {
            factory: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active.');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
      tenantId: user.tenantId,
      activeFactoryId: context.activeFactoryId,
      accessibleFactories: user.factoryAccesses.map((access) => access.factory),
      roles: context.roles,
      permissions: context.permissions,
    };
  }

  getAccessTokenTtlSeconds(): number {
    return this.configService.get<number>('auth.jwtAccessTtlSeconds', 900);
  }

  getCookieName(): string {
    return this.configService.get<string>('auth.cookieName', 'paypoq_refresh_token');
  }

  private async createSession(
    userId: string,
    requestedFactoryId?: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthSessionResult> {
    const context = await this.buildRequestContext(userId, requestedFactoryId);
    const refreshToken = this.createOpaqueRefreshToken();

    await this.prisma.refreshSession.create({
      data: {
        tenantId: context.tenantId,
        userId,
        tokenHash: this.hashRefreshToken(refreshToken),
        userAgent,
        ipAddress,
        expiresAt: this.getRefreshExpiresAt(),
      },
    });

    return {
      accessToken: this.signAccessToken(userId, context.tenantId),
      refreshToken,
      context,
      me: await this.buildMeResponse(context),
    };
  }

  private async buildRequestContext(userId: string, requestedFactoryId?: string): Promise<RequestContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        deletedAt: true,
        tenant: {
          select: {
            status: true,
            deletedAt: true,
          },
        },
        roles: {
          where: {
            role: {
              deletedAt: null,
            },
          },
          select: {
            role: {
              select: {
                name: true,
                permissions: {
                  select: {
                    permission: {
                      select: {
                        key: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        factoryAccesses: {
          where: {
            factory: {
              deletedAt: null,
            },
          },
          select: {
            factoryId: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is not active.');
    }

    await this.assertTenantCanAuthenticate(user.tenant);

    const accessibleFactoryIds = user.factoryAccesses.map((access) => access.factoryId);
    const activeFactoryId = requestedFactoryId ?? accessibleFactoryIds[0] ?? null;

    if (requestedFactoryId && !accessibleFactoryIds.includes(requestedFactoryId)) {
      throw new ForbiddenException('Factory access is not allowed.');
    }

    const roles = user.roles.map((userRole) => userRole.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
        ),
      ),
    ).sort();

    return {
      userId: user.id,
      tenantId: user.tenantId,
      activeFactoryId,
      accessibleFactoryIds,
      roles,
      permissions,
    };
  }

  private signAccessToken(userId: string, tenantId: string): string {
    return jwt.sign(
      {
        tenantId,
      },
      this.getJwtSecret(),
      {
        subject: userId,
        expiresIn: this.getAccessTokenTtlSeconds(),
      },
    );
  }

  private verifyAccessToken(accessToken: string): JwtAccessPayload {
    try {
      const payload = jwt.verify(accessToken, this.getJwtSecret());

      if (!payload || typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid access token.');
      }

      const tenantId = payload.tenantId;

      if (typeof tenantId !== 'string') {
        throw new UnauthorizedException('Invalid access token.');
      }

      return {
        sub: payload.sub,
        tenantId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid access token.');
    }
  }

  private createOpaqueRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getRefreshExpiresAt(): Date {
    const ttlDays = this.configService.get<number>('auth.refreshTokenTtlDays', 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    return expiresAt;
  }

  private getJwtSecret(): string {
    return this.configService.get<string>('auth.jwtAccessSecret', 'dev-only-change-me');
  }

  private async assertTenantCanAuthenticate(
    userOrTenant:
      | TenantAuthAuditUser
      | {
          status: string;
          deletedAt: Date | null;
        },
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const tenant = 'tenant' in userOrTenant ? userOrTenant.tenant : userOrTenant;

    if (tenant.deletedAt || !ALLOWED_TENANT_STATUSES.includes(tenant.status as 'ACTIVE' | 'PILOT')) {
      if ('tenant' in userOrTenant) {
        await this.recordBlockedLogin(userOrTenant, 'TENANT_NOT_ACTIVE', userAgent, ipAddress);
      }

      throw new ForbiddenException(BLOCKED_TENANT_MESSAGE);
    }
  }

  private buildRateLimitKey(scope: string, subject: string, ipAddress?: string): string {
    return `${scope}:${ipAddress ?? 'unknown-ip'}:${subject}`;
  }

  private async findSingleUserForAuthAudit(email: string): Promise<TenantAuthAuditUser | null> {
    const users = await this.prisma.user.findMany({
      where: {
        email,
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        tenant: {
          select: {
            status: true,
            deletedAt: true,
          },
        },
      },
      take: 2,
    });

    return users.length === 1 ? users[0] : null;
  }

  private async recordBlockedRefresh(
    tokenHash: string,
    reason: string,
    userAgent?: string,
    ipAddress?: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            tenantId: true,
            email: true,
            tenant: {
              select: {
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return;
    }

    await this.recordBlockedLogin(session.user, reason, userAgent, ipAddress, {
      ...metadata,
      refreshSessionId: session.id,
    });
  }

  private async recordBlockedLogin(
    user: TenantAuthAuditUser | null,
    reason: string,
    userAgent?: string,
    ipAddress?: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    if (!user) {
      return;
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'AUTH_LOGIN_BLOCKED',
          entityType: 'Auth',
          entityId: user.id,
          metadata: {
            reason,
            email: user.email,
            ipAddress,
            userAgent,
            tenantStatus: user.tenant.status,
            tenantDeleted: Boolean(user.tenant.deletedAt),
            ...metadata,
          },
        },
      });
    } catch {
      // Auth must not fail because forensic logging failed.
    }
  }
}
