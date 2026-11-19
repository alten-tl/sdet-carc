import type { INestApplication } from '@nestjs/common';
import type { DataSource } from 'typeorm';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  lambdaRuntimeUrl: string;
}

let context: TestContext | undefined;

export const setTestContext = (value: TestContext): void => {
  context = value;
};

export const getTestContext = (): TestContext => {
  if (!context) {
    throw new Error(
      'The test context is not initialized. The BeforeAll hook probably failed.',
    );
  }

  return context;
};
