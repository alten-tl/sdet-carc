import { disposeAppointmentsContainer } from '@lambda/container';
import { startLocalLambdaRuntime } from '@lambda/local-runtime/local-runtime-server';

const main = async (): Promise<void> => {
  try {
    process.loadEnvFile();
  } catch {
    console.warn('.env file not found, using the process environment.');
  }

  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and provide the connection string.',
    );
  }

  const port = Number(process.env.LOCAL_LAMBDA_PORT ?? 3001);
  const runtime = await startLocalLambdaRuntime({ port });

  const shutdown = (): void => {
    void disposeAppointmentsContainer()
      .catch(() => undefined)
      .finally(() => {
        void runtime.close().finally(() => process.exit(0));
      });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`Local Lambda runtime listening on ${runtime.url}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
