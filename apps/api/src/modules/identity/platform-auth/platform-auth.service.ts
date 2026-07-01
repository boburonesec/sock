import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlatformAdmin } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PlatformAdminContext,
  PlatformAuthSessionResult,
  PlatformJwtAccessPayload,
} from './platform-auth.types';

const INVALID_PLATFORM_CREDENTIALS_MESSAGE = 'Invalid platform admin credentials.';

@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<PlatformAuthSessionResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const platformAdmin = await this.prisma.platformAdmin.findUnique({
      where: {
        email: normalizedEmail,
      },
      include: {
        credential: true,
      },
    });

    if (
      !platformAdmin ||
      !platformAdmin.credential ||
      platformAdmin.deletedAt ||
      platformAdmin.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(INVALID_PLATFORM_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await argon2.verify(
      platformAdmin.credential.passwordHash,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_PLATFORM_CREDENTIALS_MESSAGE);
    }

    return this.createSession(platformAdmin, userAgent, ipAddress);
  }

  async refresh(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<PlatformAuthSessionResult> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    const now = new Date();
    const existingSession = await this.prisma.platformRefreshSession.findUnique({
      where: { tokenHash },
      include: {
        platformAdmin: true,
      },
    });

    if (
      !existingSession ||
      existingSession.revokedAt ||
      existingSession.expiresAt <= now ||
      existingSession.platformAdmin.deletedAt ||
      existingSession.platformAdmin.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid platform refresh session.');
    }

    const nextRefreshToken = this.createOpaqueRefreshToken();
    const nextRefreshTokenHash = this.hashRefreshToken(nextRefreshToken);
    const expiresAt = this.getRefreshExpiresAt();

    await this.prisma.$transaction([
      this.prisma.platformRefreshSession.update({
        where: { id: existingSession.id },
        data: { revokedAt: now },
      }),
      this.prisma.platformRefreshSession.create({
        data: {
          platformAdminId: existingSession.platformAdminId,
          tokenHash: nextRefreshTokenHash,
          userAgent,
          ipAddress,
          expiresAt,
        },
      }),
      this.prisma.platformAuditLog.create({
        data: {
          platformAdminId: existingSession.platformAdminId,
          action: 'PLATFORM_ADMIN_REFRESH',
          entityType: 'PlatformRefreshSession',
          entityId: existingSession.id,
        },
      }),
    ]);

    const platformAdmin = existingSession.platformAdmin;

    return {
      accessToken: this.signAccessToken(platformAdmin.id),
      refreshToken: nextRefreshToken,
      me: this.toContext(platformAdmin),
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const existingSession = await this.prisma.platformRefreshSession.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!existingSession || existingSession.revokedAt) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.platformRefreshSession.update({
        where: {
          id: existingSession.id,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prisma.platformAuditLog.create({
        data: {
          platformAdminId: existingSession.platformAdminId,
          action: 'PLATFORM_ADMIN_LOGOUT',
          entityType: 'PlatformRefreshSession',
          entityId: existingSession.id,
        },
      }),
    ]);
  }

  async getContextFromAccessToken(accessToken: string): Promise<PlatformAdminContext> {
    const payload = this.verifyAccessToken(accessToken);
    const platformAdmin = await this.prisma.platformAdmin.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!platformAdmin || platformAdmin.deletedAt || platformAdmin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Platform admin is not active.');
    }

    return this.toContext(platformAdmin);
  }

  getAccessTokenTtlSeconds(): number {
    return this.configService.get<number>('auth.jwtAccessTtlSeconds', 900);
  }

  getCookieName(): string {
    return this.configService.get<string>(
      'platformAuth.cookieName',
      'paypoq_platform_refresh_token',
    );
  }

  private async createSession(
    platformAdmin: PlatformAdmin,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<PlatformAuthSessionResult> {
    const refreshToken = this.createOpaqueRefreshToken();

    await this.prisma.$transaction([
      this.prisma.platformAdmin.update({
        where: {
          id: platformAdmin.id,
        },
        data: {
          lastLoginAt: new Date(),
        },
      }),
      this.prisma.platformRefreshSession.create({
        data: {
          platformAdminId: platformAdmin.id,
          tokenHash: this.hashRefreshToken(refreshToken),
          userAgent,
          ipAddress,
          expiresAt: this.getRefreshExpiresAt(),
        },
      }),
      this.prisma.platformAuditLog.create({
        data: {
          platformAdminId: platformAdmin.id,
          action: 'PLATFORM_ADMIN_LOGIN',
          entityType: 'PlatformAdmin',
          entityId: platformAdmin.id,
          metadata: {
            email: platformAdmin.email,
          },
        },
      }),
    ]);

    return {
      accessToken: this.signAccessToken(platformAdmin.id),
      refreshToken,
      me: this.toContext(platformAdmin),
    };
  }

  private toContext(platformAdmin: PlatformAdmin): PlatformAdminContext {
    return {
      platformAdminId: platformAdmin.id,
      email: platformAdmin.email,
      name: platformAdmin.name,
      status: platformAdmin.status,
    };
  }

  private signAccessToken(platformAdminId: string): string {
    return jwt.sign(
      {
        type: 'platform',
      },
      this.getJwtSecret(),
      {
        subject: platformAdminId,
        expiresIn: this.getAccessTokenTtlSeconds(),
      },
    );
  }

  private verifyAccessToken(accessToken: string): PlatformJwtAccessPayload {
    try {
      const payload = jwt.verify(accessToken, this.getJwtSecret());

      if (!payload || typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid platform access token.');
      }

      if (payload.type !== 'platform') {
        throw new UnauthorizedException('Invalid platform access token.');
      }

      return {
        sub: payload.sub,
        type: 'platform',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid platform access token.');
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
    return this.configService.get<string>(
      'platformAuth.jwtAccessSecret',
      'local-development-platform-jwt-secret-change-me',
    );
  }

}
