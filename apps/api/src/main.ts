import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('app.corsOrigin', 'http://localhost:3000');

  // Security headers (API is JSON — CSP not required here; web owns page CSP).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      // API may be called cross-origin from the web app.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Trust reverse proxy (Nginx/Caddy) so request.ip (rate limiting) and Secure cookies work.
  const expressApp = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
    disable?: (key: string) => void;
  };
  expressApp.set?.('trust proxy', 1);
  expressApp.disable?.('x-powered-by');

  const rawCorsOrigin = configService.get<string>('app.corsOrigin', '*');
  app.enableCors({
    origin: rawCorsOrigin === '*' ? true : rawCorsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });

  // All operator-facing API errors → single Uzbek `message` (UI-safe).
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const port = configService.get<number>('app.port', 3001);

  // Migrations are NOT run here. `prisma migrate deploy` is an explicit release
  // step that must succeed before this process is started or receives traffic
  // (see docs/RELEASE_RUNBOOK_V1.md). A process that boots against an
  // un-migrated database fails GET /health/readiness, so the rollout stops
  // instead of serving against an incompatible schema.
  await app.listen(port, '0.0.0.0');
}

void bootstrap();


