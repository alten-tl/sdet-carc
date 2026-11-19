import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@codegenie/serverless-express';
import type { Context } from 'aws-lambda';
import { AppModule } from './app.module';
import { configureApp } from './api/configure-app';
import { setupApiDocumentation } from './api/inbound/http/openapi';

type ApiLambdaHandler = (event: unknown, context: Context) => Promise<unknown>;

let handler: ApiLambdaHandler | undefined;

const buildHandler = async (): Promise<ApiLambdaHandler> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  configureApp(app);
  setupApiDocumentation(app);

  await app.init();
  app.flushLogs();

  const expressApp = app.getHttpAdapter().getInstance();

  return serverlessExpress({ app: expressApp }) as unknown as ApiLambdaHandler;
};

export const apiLambdaHandler: ApiLambdaHandler = async (event, context) => {
  handler ??= await buildHandler();

  return handler(event, context);
};
