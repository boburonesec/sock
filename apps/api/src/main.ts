import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { createTrustedProxyFn } from './common/trusted-proxy';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { checkSchemaCompatibility, loadBuildMigrations } from './health/schema-compatibility';
import { assertSchemaReadyForStartup } from './health/startup-schema-gate';
import { PrismaService } from './prisma/prisma.service';

const logger = new Logger('Bootstrap');

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

  // request.ip keys the auth rate limiter: X-Forwarded-For is honoured for one
  // hop and only from a TRUSTED_PROXIES peer (default loopback), so a client
  // that reaches the API directly cannot forge its limiter identity.
  const expressApp = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
    disable?: (key: string) => void;
  };
  expressApp.set?.(
    'trust proxy',
    createTrustedProxyFn(configService.get<string>('app.trustedProxies', 'loopback')),
  );
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
  // step that must succeed before this process is started (see
  // docs/RELEASE_RUNBOOK_V1.md). This read-only gate enforces that: a
  // production process whose required migrations are missing, failed or
  // unverifiable never starts listening. Readiness applies the same check at
  // runtime, but nginx/compose do not gate traffic on it, so startup must.
  const prisma = app.get(PrismaService);
  const expectedMigrations = loadBuildMigrations();
  try {
    await assertSchemaReadyForStartup({
      nodeEnv: configService.get<string>('app.nodeEnv', 'development'),
      check: () => checkSchemaCompatibility(prisma, expectedMigrations),
      warn: (message) => logger.warn(message),
    });
  } catch (error) {
    // Release DB/timer handles, but never let a close failure mask the cause.
    await app.close().catch(() => undefined);
    throw error;
  }

  await app.listen(port, configService.get<string>('app.bindHost', '0.0.0.0'));
}

bootstrap().catch((error: unknown) => {
  // Single boundary for startup failures (invalid config, schema gate):
  // log once, then exit non-zero so the supervisor sees a failed start.
  logger.error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
  );
  process.exit(1);
});


