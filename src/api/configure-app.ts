import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ApiExceptionFilter } from './inbound/http/api-exception.filter';

export const API_GLOBAL_PREFIX = 'api/v1';

export const configureApp = (app: INestApplication): void => {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new ApiExceptionFilter());
};
