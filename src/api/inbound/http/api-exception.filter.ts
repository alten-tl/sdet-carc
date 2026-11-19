import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiError } from '@api/errors/error-catalog';
interface HttpExceptionBody {
  message?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ApiError) {
      response.status(exception.status).json({
        code: exception.code,
        message: exception.message,
        details: exception.details,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body: HttpExceptionBody =
        typeof payload === 'string'
          ? { message: payload }
          : (payload as HttpExceptionBody);

      response.status(status).json({
        code: status === 400 ? 'INVALID_PAYLOAD' : 'REQUEST_FAILED',
        message:
          typeof body.message === 'string' ? body.message : exception.message,
        details: Array.isArray(body.message) ? body.message : undefined,
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  }
}
