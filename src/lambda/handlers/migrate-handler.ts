import { runMigrations } from '@lambda/modules/appointments/infrastructure/persistence/migrate-runner';
import { createSecretProvider } from '@lambda/config/secret-provider';

export interface MigrationHandlerResult {
  applied: string[];
}

export const migrateHandler = async (): Promise<MigrationHandlerResult> => {
  const connectionUrl = await createSecretProvider().getDatabaseUrl();
  const applied = await runMigrations(connectionUrl, { logging: true });

  return {
    applied: applied.map((migration) => migration.name),
  };
};
