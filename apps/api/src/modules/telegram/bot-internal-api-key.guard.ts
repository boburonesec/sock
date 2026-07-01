import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class BotInternalApiKeyGuard implements CanActivate {
  private readonly internalApiKey: string;

  constructor(configService: ConfigService) {
    this.internalApiKey = configService.getOrThrow<string>('bot.internalApiKey');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header('x-bot-api-key')?.trim();

    if (!apiKey || !safeEquals(apiKey, this.internalApiKey)) {
      throw new UnauthorizedException('Invalid bot API key.');
    }

    return true;
  }
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
