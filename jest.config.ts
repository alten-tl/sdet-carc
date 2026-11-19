import type { Config } from 'jest';
import { pathsToModuleNameMapper } from 'ts-jest';
import ts from 'typescript';

// Path aliases (e.g. the ones added by `nest g library`) live in tsconfig.json,
// so they are read from there instead of being duplicated here.
const { config: tsconfig } = ts.readConfigFile(
  './tsconfig.json',
  ts.sys.readFile,
);
const paths = tsconfig?.compilerOptions?.paths ?? {};

// The coverage scope is the unit testable core: the contracts, the domain rules
// and the use cases. The API adapters, the Lambda handlers and the persistence
// layer are covered end to end by the Cucumber acceptance suite.
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  collectCoverageFrom: [
    'src/contracts/**/*.ts',
    'src/lambda/modules/appointments/domain/**/*.ts',
    'src/lambda/modules/appointments/application/**/*.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    './src/lambda/modules/appointments/domain/': {
      statements: 95,
      branches: 95,
      functions: 100,
      lines: 95,
    },
  },
  testEnvironment: 'node',
};

export default config;
