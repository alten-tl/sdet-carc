import {
  AfterAll,
  Before,
  BeforeAll,
  setWorldConstructor,
} from '@cucumber/cucumber';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/api/configure-app';
import { disposeAppointmentsContainer } from '../../src/lambda/container';
import { startLocalLambdaRuntime } from '../../src/lambda/local-runtime/local-runtime-server';
import { runMigrations } from '../../src/lambda/modules/appointments/infrastructure/persistence/migrate-runner';
import { setTestContext } from './app-context';
import { connectToDatabase, resetDatabase } from './test-database';
import { AppointmentWorld } from './world';

setWorldConstructor(AppointmentWorld);

let app: INestApplication | undefined;
let runtime: { url: string; close: () => Promise<void> } | undefined;
let dataSource: DataSource | undefined;

const findFreePort = async (): Promise<number> => {
  const server = createServer();

  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });

  const { port } = server.address() as AddressInfo;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  return port;
};

BeforeAll(async () => {
  try {
    process.loadEnvFile();
  } catch {
    console.warn('.env file not found, using the process environment.');
  }

  const connectionUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!connectionUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env before running the acceptance tests.',
    );
  }

  await runMigrations(connectionUrl);

  dataSource = await connectToDatabase(connectionUrl);

  runtime = await startLocalLambdaRuntime({ port: await findFreePort() });

  process.env.DATABASE_URL = connectionUrl;
  process.env.LAMBDA_ENDPOINT = runtime.url;
  process.env.LAMBDA_FUNCTION_NAME = 'appointments';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  setTestContext({ app, dataSource, lambdaRuntimeUrl: runtime.url });
});

Before(async () => {
  await resetDatabase(dataSource!);
});

AfterAll(async () => {
  await app?.close();
  await runtime?.close();
  await disposeAppointmentsContainer().catch(() => undefined);
  await dataSource?.destroy();
});
