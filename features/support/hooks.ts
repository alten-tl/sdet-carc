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
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/api/configure-app';
import { disposeAppointmentsContainer } from '../../src/lambda/container';
import { startLocalLambdaRuntime } from '../../src/lambda/local-runtime/local-runtime-server';
import { runMigrations } from '../../src/lambda/modules/appointments/infrastructure/persistence/migrate-runner';
import { setTestContext } from './app-context';
import { connectToDatabase, resetDatabase } from './test-database';
import { AppointmentWorld } from './world';

setWorldConstructor(AppointmentWorld);

const POSTGRES_IMAGE = 'postgres:17-alpine';

const SETUP_TIMEOUT = 180_000;
const FORCE_EXIT_TIMEOUT = 30_000;

let app: INestApplication | undefined;
let runtime: { url: string; close: () => Promise<void> } | undefined;
let dataSource: DataSource | undefined;
let database: StartedPostgreSqlContainer | undefined;
let databaseStart: Promise<StartedPostgreSqlContainer> | undefined;

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

const startDatabase = async (): Promise<string> => {
  const externalUrl = process.env.TEST_DATABASE_URL;

  if (externalUrl) {
    return externalUrl;
  }

  const container = new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase('appointments_test')
    .withUsername('app')
    .withPassword('app');

  databaseStart = container.start();

  try {
    database = await databaseStart;

    return database.getConnectionUri();
  } catch (error) {
    await databaseStart
      .then((started) => started.stop())
      .catch(() => undefined);

    throw error;
  }
};

const stopDatabase = async (): Promise<void> => {
  if (database) {
    await database.stop().catch(() => undefined);

    return;
  }

  if (databaseStart) {
    await databaseStart
      .then((started) => started.stop())
      .catch(() => undefined);
  }
};

BeforeAll({ timeout: SETUP_TIMEOUT }, async () => {
  try {
    process.loadEnvFile();
  } catch {
    console.warn('.env file not found, using the process environment.');
  }

  const testConnectionUrl = await startDatabase();

  await runMigrations(testConnectionUrl);
  dataSource = await connectToDatabase(testConnectionUrl);

  runtime = await startLocalLambdaRuntime({ port: await findFreePort() });

  process.env.DATABASE_URL = testConnectionUrl;
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
  const forceExit = setTimeout(() => {
    console.error(
      'The test run did not release every resource, forcing the exit.',
    );
    process.exit(process.exitCode ?? 1);
  }, FORCE_EXIT_TIMEOUT);

  forceExit.unref();

  await app?.close();
  await runtime?.close();
  await disposeAppointmentsContainer().catch(() => undefined);
  await dataSource?.destroy();
  await stopDatabase();

  clearTimeout(forceExit);
});
