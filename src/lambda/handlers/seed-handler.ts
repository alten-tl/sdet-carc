import { runSeed } from '@lambda/modules/appointments/infrastructure/persistence/seed-runner';
import { createSecretProvider } from '@lambda/config/secret-provider';

export interface SeedHandlerResult {
  seeded: boolean;
}

export const seedHandler = async (): Promise<SeedHandlerResult> => {
  const connectionUrl = await createSecretProvider().getDatabaseUrl();

  await runSeed(connectionUrl);

  return { seeded: true };
};
