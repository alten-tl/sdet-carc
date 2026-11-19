import { DataSource, Migration } from 'typeorm';
import { buildDataSourceOptions } from './datasource';

export interface MigrationRunOptions {
  revert?: boolean;
  logging?: boolean;
}

export const runMigrations = async (
  connectionUrl: string,
  options: MigrationRunOptions = {},
): Promise<Migration[]> => {
  const dataSource = new DataSource(
    buildDataSourceOptions(connectionUrl, options.logging ?? false),
  );

  await dataSource.initialize();

  try {
    if (options.revert) {
      await dataSource.undoLastMigration();
      return [];
    }

    return await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
};
