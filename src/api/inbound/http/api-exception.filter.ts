import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ProblemError } from '@contracts/protocol/problem.schemas';
import { ApiProblem, toProblemDetails } from '@api/errors/problem-details';

interface HttpExceptionBody {
  message?: unknown;
}

const toProblemError = (message: string): ProblemError => {
  const separator = message.indexOf(': ');

  if (separator === -1) {
    return { path: '', message };
  }

  return {
    path: message.slice(0, separator),
    message: message.slice(separator + 2),
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const instance = context.getRequest<Request>().originalUrl;

    if (exception instanceof ApiProblem) {
      this.send(
        response,
        toProblemDetails({
          code: exception.code,
          detail: exception.detail,
          details: exception.details,
          instance,
        }),
      );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body: HttpExceptionBody =
        typeof payload === 'string'
          ? { message: payload }
          : (payload as HttpExceptionBody);
      const messages = Array.isArray(body.message)
        ? body.message.map(String)
        : [];

      this.send(
        response,
        toProblemDetails({
          code: status === 400 ? 'INVALID_PAYLOAD' : 'REQUEST_FAILED',
          detail: messages.length > 0 ? 'The request payload is not valid.' : exception.message,
          errors: messages.map(toProblemError),
          instance,
        }),
      );
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );

    this.send(
      response,
      toProblemDetails({
        code: 'INTERNAL_ERROR',
        detail: 'An unexpected error occurred while processing the request.',
        instance,
      }),
    );
  }

  private send(
    response: Response,
    problem: ReturnType<typeof toProblemDetails>,
  ): void {
    response.status(problem.status).type('application/problem+json').json(problem);
  }
}
