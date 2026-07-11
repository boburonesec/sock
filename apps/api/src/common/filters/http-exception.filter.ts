import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  defaultMessageForStatus,
  translateOperatorMessages,
} from '../i18n/operator-error-messages';

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

    const message = translateOperatorMessages(rawMessage, statusCode);

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
