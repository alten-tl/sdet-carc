import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { Express, Request, RequestHandler, Response } from 'express';

export const OPENAPI_JSON_PATH = '/api/openapi.json';
export const API_DOCS_PATH = '/api/docs';

export const setupApiDocumentation = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Appointments API')
    .setDescription(
      'REST API that consumes the appointments Lambda to run CRUD operations against a PostgreSQL database.',
    )
    .setVersion('1.0.0')
    .setOpenAPIVersion('3.1.0')
    .addTag('appointments', 'Appointment scheduling operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.get(OPENAPI_JSON_PATH, (_req: Request, res: Response) => {
    res.json(document);
  });

  expressApp.use(
    API_DOCS_PATH,
    apiReference({ url: OPENAPI_JSON_PATH }) as RequestHandler,
  );
};
