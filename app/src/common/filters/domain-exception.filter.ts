import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Global exception filter that converts unhandled domain value-object
 * validation errors (plain Error instances) into 400 Bad Request responses.
 *
 * Without this filter, any `throw new Error(...)` from domain code (e.g.
 * SlotDate.create, TimeOfDay.fromString, Duration.create) would result
 * in a generic 500 Internal Server Error. This filter catches them and
 * returns a descriptive 400 instead.
 *
 * HttpException subclasses (BadRequestException, NotFoundException, etc.)
 * are NOT caught here — they pass through to NestJS's built-in handler.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Let NestJS HttpExceptions pass through normally
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(body);
      return;
    }

    // TypeError from accessing properties on undefined (e.g., body is undefined)
    if (exception instanceof TypeError) {
      this.logger.warn(`TypeError → 400: ${exception.message}`);
      response.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'リクエストの形式が不正です',
      });
      return;
    }

    // Domain validation errors (plain Error from value objects)
    if (exception instanceof Error) {
      const message = exception.message;

      // Heuristic: domain VO validation errors contain these patterns
      if (this.isDomainValidationError(message)) {
        this.logger.warn(`Domain validation error → 400: ${message}`);
        response.status(400).json({
          error: 'VALIDATION_ERROR',
          message,
        });
        return;
      }

      // Prisma errors with null byte / invalid data
      if (
        message.includes('invalid input') ||
        message.includes('null value') ||
        message.includes('invalid byte sequence')
      ) {
        this.logger.warn(`Database validation error → 400: ${message}`);
        response.status(400).json({
          error: 'VALIDATION_ERROR',
          message: '入力値に不正な文字が含まれています',
        });
        return;
      }

      // Truly unexpected errors → 500
      this.logger.error(
        `Unhandled error → 500: ${message}`,
        exception.stack,
      );
      response.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
      return;
    }

    // Non-Error throw (extremely rare)
    this.logger.error('Unknown exception type', String(exception));
    response.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }

  private isDomainValidationError(message: string): boolean {
    const patterns = [
      'must be',
      'must not be',
      'is required',
      'cannot be',
      'Invalid',
      'invalid',
      'format',
      'positive',
      'negative',
      'empty',
      'exceed',
      'range',
      'overlap',
      'duplicate',
    ];
    return patterns.some((p) => message.includes(p));
  }
}
