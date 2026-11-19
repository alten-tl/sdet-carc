import { runMigrations } from '../appointments/infrastructure/persistence/migrate-runner';

const loadLocalEnv = (): void => {
  try {
    process.loadEnvFile();
  } catch {
    return;
  }
};

const main = async (): Promise<void> => {
  loadLocalEnv();

  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and provide the connection string.',
    );
  }

  const revert = process.argv.includes('--revert');
  const applied = await runMigrations(connectionUrl, { revert, logging: true });

  if (revert) {
    console.log('Reverted the last migration.');
    return;
  }

  if (applied.length === 0) {
    console.log('Database schema is already up to date.');
    return;
  }

  for (const migration of applied) {
    console.log(`Applied migration: ${migration.name}`);
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
