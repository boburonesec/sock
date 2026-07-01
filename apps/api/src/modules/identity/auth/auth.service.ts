import {
  ForbiddenException,
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

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const BLOCKED_TENANT_MESSAGE = 'Tenant is not active.';
const ALLOWED_TENANT_STATUSES = ['ACTIVE', 'PILOT'] as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string, userAgent?: string, ipAddress?: string): Promise<AuthSessionResult> {
    const normalizedEmail = email.trim().toLowerCase();
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

    this.assertTenantCanAuthenticate(user.tenant);

    const isPasswordValid = await argon2.verify(credential.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

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

    this.assertTenantCanAuthenticate(existingSession.user.tenant);

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

    this.assertTenantCanAuthenticate(user.tenant);

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

  private assertTenantCanAuthenticate(tenant: {
    status: string;
    deletedAt: Date | null;
  }): void {
    if (tenant.deletedAt || !ALLOWED_TENANT_STATUSES.includes(tenant.status as 'ACTIVE' | 'PILOT')) {
      throw new ForbiddenException(BLOCKED_TENANT_MESSAGE);
    }
  }
}
