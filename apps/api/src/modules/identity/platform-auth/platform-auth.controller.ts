import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ChangePasswordDto, LoginDto } from '../auth/login.dto';
import { CurrentPlatformAdmin } from './current-platform-admin.decorator';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformAdminContext } from './platform-auth.types';
import { PlatformJwtAuthGuard } from './platform-jwt-auth.guard';

@Controller('platform-auth')
export class PlatformAuthController {
  constructor(
    private readonly platformAuthService: PlatformAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.platformAuthService.login(
      loginDto.email,
      loginDto.password,
      request.header('user-agent'),
      request.ip,
    );

    this.setRefreshCookie(response, result.refreshToken);

    return {
      data: {
        platformAdmin: result.me,
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: this.platformAuthService.getAccessTokenTtlSeconds(),
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.getCookieValue(
      request,
      this.platformAuthService.getCookieName(),
    );
    const result = await this.platformAuthService.refresh(
      refreshToken,
      request.header('user-agent'),
      request.ip,
    );

    this.setRefreshCookie(response, result.refreshToken);

    return {
      data: {
        platformAdmin: result.me,
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: this.platformAuthService.getAccessTokenTtlSeconds(),
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.getCookieValue(
      request,
      this.platformAuthService.getCookieName(),
    );
    await this.platformAuthService.logout(refreshToken);
    this.clearRefreshCookie(response);

    return {
      data: {
        status: 'ok',
      },
    };
  }

  @Get('me')
  @UseGuards(PlatformJwtAuthGuard)
  me(@CurrentPlatformAdmin() platformAdmin: PlatformAdminContext) {
    return {
      data: {
        platformAdmin,
      },
    };
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(PlatformJwtAuthGuard)
  async changePassword(
    @CurrentPlatformAdmin() platformAdmin: PlatformAdminContext,
    @Body() dto: ChangePasswordDto,
  ) {
    return {
      data: await this.platformAuthService.changePassword(platformAdmin, dto),
    };
  }

  private getSameSite(): 'lax' | 'strict' | 'none' {
    const configured = this.configService.get<string>('platformAuth.cookieSameSite');
    if (configured === 'strict' || configured === 'lax' || configured === 'none') {
      return configured;
    }

    // In production, when web and API reside on separate cross-site origins (e.g. Render subdomains),
    // SameSite=None is required so the refresh cookie is sent on cross-site fetch.
    // In development (http://), SameSite=None is rejected by browsers without Secure=true,
    // so default to 'lax' for local development.
    return this.isProduction() ? 'none' : 'lax';
  }

  private isPartitioned(): boolean {
    return this.isProduction() || this.getSameSite() === 'none';
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    const isProd = this.isProduction();
    const sameSite = this.getSameSite();
    const secure = isProd || sameSite === 'none';

    response.cookie(this.platformAuthService.getCookieName(), refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      partitioned: this.isPartitioned(),
      path: '/platform-auth',
      maxAge: this.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearRefreshCookie(response: Response): void {
    const isProd = this.isProduction();
    const sameSite = this.getSameSite();
    const secure = isProd || sameSite === 'none';

    response.clearCookie(this.platformAuthService.getCookieName(), {
      httpOnly: true,
      secure,
      sameSite,
      partitioned: this.isPartitioned(),
      path: '/platform-auth',
    });
  }

  private getCookieValue(request: Request, cookieName: string): string {
    const cookieHeader = request.header('cookie');

    if (!cookieHeader) {
      return '';
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    const cookiePrefix = `${cookieName}=`;
    const cookie = cookies.find((item) => item.startsWith(cookiePrefix));

    if (!cookie) {
      return '';
    }

    return decodeURIComponent(cookie.slice(cookiePrefix.length));
  }

  private getRefreshCookieMaxAgeMs(): number {
    const ttlDays = this.configService.get<number>('auth.refreshTokenTtlDays', 30);

    return ttlDays * 24 * 60 * 60 * 1000;
  }

  private isProduction(): boolean {
    return this.configService.get<string>('app.nodeEnv', 'development') === 'production';
  }
}
