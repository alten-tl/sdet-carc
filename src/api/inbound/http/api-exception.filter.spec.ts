import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiProblem } from '@api/errors/problem-details';
import { ApiExceptionFilter } from './api-exception.filter';

interface CapturedResponse {
  status?: number;
  contentType?: string;
  body?: Record<string, unknown>;
}

const buildHost = (originalUrl = '/api/v1/appointments'): {
  host: ArgumentsHost;
  captured: CapturedResponse;
} => {
  const captured: CapturedResponse = {};

  const response = {
    status: jest.fn((code: number) => {
      captured.status = code;

      return response;
    }),
    type: jest.fn((contentType: string) => {
      captured.contentType = contentType;

      return response;
    }),
    json: jest.fn((body: Record<string, unknown>) => {
      captured.body = body;

      return response;
    }),
  } as unknown as Response;

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ originalUrl }),
    }),
  } as unknown as ArgumentsHost;

  return { host, captured };
};

describe('ApiExceptionFilter', () => {
  it('renders an ApiProblem as a problem document', () => {
    const { host, captured } = buildHost();
    const filter = new ApiExceptionFilter();

    filter.catch(
      new ApiProblem(
        'SLOT_NOT_AVAILABLE',
        'The requested time slot is already taken.',
      ),
      host,
    );

    expect(captured.status).toBe(409);
    expect(captured.contentType).toBe('application/problem+json');
    expect(captured.body?.code).toBe('SLOT_NOT_AVAILABLE');
    expect(captured.body?.type).toBe(
      'https://api.alten.com/problems/slot-not-available',
    );
  });

  it('answers a 404 with the not found problem and keeps the status', () => {
    const { host, captured } = buildHost('/api/v1/unknown');
    const filter = new ApiExceptionFilter();

    filter.catch(new NotFoundException('Cannot GET /api/v1/unknown'), host);

    expect(captured.status).toBe(404);
    expect(captured.contentType).toBe('application/problem+json');
    expect(captured.body?.code).toBe('NOT_FOUND');
    expect(captured.body?.status).toBe(404);
    expect(captured.body?.type).toBe(
      'https://api.alten.com/problems/not-found',
    );
  });

  it('answers a 400 with the invalid payload problem and the field errors', () => {
    const { host, captured } = buildHost();
    const filter = new ApiExceptionFilter();

    filter.catch(
      new BadRequestException({
        message: ['date: Invalid ISO date'],
        error: 'Bad Request',
        statusCode: 400,
      }),
      host,
    );

    expect(captured.status).toBe(400);
    expect(captured.body?.code).toBe('INVALID_PAYLOAD');
    expect(captured.body?.errors).toEqual([
      { path: 'date', message: 'Invalid ISO date' },
    ]);
  });

  it('keeps the status of an HTTP error that is neither 400 nor 404', () => {
    const { host, captured } = buildHost('/api/v1/appointments');
    const filter = new ApiExceptionFilter();

    filter.catch(
      new HttpException('Method Not Allowed', HttpStatus.METHOD_NOT_ALLOWED),
      host,
    );

    expect(captured.status).toBe(405);
    expect(captured.body?.code).toBe('REQUEST_FAILED');
    expect(captured.body?.status).toBe(405);
  });

  it('hides the details of an unexpected error', () => {
    const { host, captured } = buildHost();
    const filter = new ApiExceptionFilter();

    filter.catch(new Error('connection string leaked'), host);

    expect(captured.status).toBe(500);
    expect(captured.body?.code).toBe('INTERNAL_ERROR');
    expect(captured.body?.detail).toBe(
      'An unexpected error occurred while processing the request.',
    );
    expect(JSON.stringify(captured.body)).not.toContain('connection string');
  });
});
