import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../prisma/client';
import {
  defaultMessageForStatus,
  translateOperatorMessages,
} from '../i18n/operator-error-messages';

const PRISMA_ERROR_STATUS: Record<string, { status: number; error: string; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Bunday qiymat allaqachon mavjud. Kod yoki nomni tekshirib, boshqasini kiriting.',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Bog‘langan yozuv topilmadi yoki boshqa yozuvlarda ishlatilmoqda.',
  },
  // Serializable transaction write conflict (two operators saving at once).
  P2034: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Ma’lumot bir vaqtda o‘zgartirildi. Qayta urinib ko‘ring.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'Yozuv topilmadi. Sahifani yangilab, qayta urinib ko‘ring.',
  },
};

function isPrismaKnownError(exception: unknown): exception is Prisma.PrismaClientKnownRequestError {
  return exception instanceof Prisma.PrismaClientKnownRequestError;
}

type ExceptionBody = string | { message?: unknown; error?: unknown; statusCode?: number };

/**
 * Ensures every API error response has a single operator-friendly Uzbek `message`.
 * UI should display `message` as-is.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: string | string[] = defaultMessageForStatus(statusCode);
    let errorName = 'Internal Server Error';
    // Already operator-ready Uzbek text; the English-oriented translator
    // would otherwise mangle it (it treats "Bunday qiymat ..." as a field error).
    let isOperatorReady = false;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      errorName = exception.name.replace(/Exception$/, '') || 'Error';
      const body = exception.getResponse() as ExceptionBody;

      if (typeof body === 'string') {
        rawMessage = body;
      } else if (body && typeof body === 'object') {
        if (typeof body.error === 'string' && body.error.trim()) {
          errorName = body.error;
        }
        if (body.message !== undefined) {
          if (Array.isArray(body.message)) {
            rawMessage = body.message.map((item) => String(item));
          } else if (typeof body.message === 'string') {
            rawMessage = body.message;
          } else {
            rawMessage = String(body.message);
          }
        } else {
          rawMessage = exception.message;
        }
      } else {
        rawMessage = exception.message;
      }
    } else if (isPrismaKnownError(exception) && PRISMA_ERROR_STATUS[exception.code]) {
      // Unique/foreign-key/not-found races (duplicate machine code, record
      // deleted mid-request) are operator errors, not 500s. Never echo the
      // Prisma message: it names tables and constraint columns.
      const mapped = PRISMA_ERROR_STATUS[exception.code];
      // Still log it: a P2025/P2003 can also mean a broken invariant in our own
      // code, which used to surface as a logged 500.
      this.logger.warn(
        `Prisma ${exception.code} on ${request.method} ${request.url} mapped to ${mapped.status} (model=${String(exception.meta?.modelName ?? '-')}, target=${JSON.stringify(exception.meta?.target ?? null)})`,
      );
      statusCode = mapped.status;
      errorName = mapped.error;
      rawMessage = mapped.message;
      isOperatorReady = true;
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      rawMessage = defaultMessageForStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    } else {
      this.logger.error(
        `Unknown error on ${request.method} ${request.url}: ${String(exception)}`,
      );
      rawMessage = defaultMessageForStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const message = isOperatorReady
      ? String(rawMessage)
      : translateOperatorMessages(rawMessage, statusCode);

    response.status(statusCode).json({
      statusCode,
      message,
      error: errorName,
      // Keep array form for multi-field validation when useful for debugging UI forms
      ...(Array.isArray(rawMessage) && rawMessage.length > 1
        ? {
            messages: rawMessage.map((item) =>
              translateOperatorMessages(String(item), statusCode),
            ),
          }
        : {}),
    });
  }
}
