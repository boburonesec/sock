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
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentContext } from '../request-context/current-context.decorator';
import { RequestContext } from '../request-context/request-context.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
      request.header('user-agent'),
      request.ip,
    );

    this.setRefreshCookie(response, result.refreshToken);

    return {
      data: {
        ...result.me,
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: this.authService.getAccessTokenTtlSeconds(),
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.getCookieValue(request, this.authService.getCookieName());
    const result = await this.authService.refresh(
      refreshToken,
      request.header('user-agent'),
      request.ip,
    );

    this.setRefreshCookie(response, result.refreshToken);

    return {
      data: {
        ...result.me,
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: this.authService.getAccessTokenTtlSeconds(),
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.getCookieValue(request, this.authService.getCookieName());
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(response);

    return {
      data: {
        status: 'ok',
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentContext() context: RequestContext) {
    return {
      data: await this.authService.buildMeResponse(context),
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(this.authService.getCookieName(), refreshToken, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: this.isProduction() ? 'strict' : 'lax',
      path: '/auth',
      maxAge: this.getRefreshCookieMaxAgeMs(),
    });
  }

  private clearRefreshCookie(response: Response): void {
    response.clearCookie(this.authService.getCookieName(), {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: this.isProduction() ? 'strict' : 'lax',
      path: '/auth',
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

