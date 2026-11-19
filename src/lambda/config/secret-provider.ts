import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';

export interface SecretProvider {
  getDatabaseUrl(): Promise<string>;
}

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      'DATABASE_URL is not set. Copy .env.example to .env and provide the connection string.',
    );
    this.name = 'MissingDatabaseUrlError';
  }
}

export class EnvironmentSecretProvider implements SecretProvider {
  async getDatabaseUrl(): Promise<string> {
    const connectionUrl = process.env.DATABASE_URL;

    if (!connectionUrl) {
      throw new MissingDatabaseUrlError();
    }

    return connectionUrl;
  }
}

interface DatabaseSecretPayload {
  DATABASE_URL?: string;
}

export class SecretsManagerSecretProvider implements SecretProvider {
  private readonly client: SecretsManagerClient;

  constructor(private readonly secretId: string) {
    this.client = new SecretsManagerClient({});
  }

  async getDatabaseUrl(): Promise<string> {
    const response = await this.client.send(
      new GetSecretValueCommand({ SecretId: this.secretId }),
    );

    const secret = response.SecretString;

    if (!secret) {
      throw new Error(
        `The secret ${this.secretId} does not contain a connection string.`,
      );
    }

    const connectionUrl = this.extractDatabaseUrl(secret);

    if (!connectionUrl) {
      throw new Error(
        `The secret ${this.secretId} does not contain the DATABASE_URL key.`,
      );
    }

    return connectionUrl;
  }

  private extractDatabaseUrl(secret: string): string | undefined {
    try {
      const payload = JSON.parse(secret) as DatabaseSecretPayload;

      return payload.DATABASE_URL;
    } catch {
      return secret.trim();
    }
  }
}

export const createSecretProvider = (
  env: NodeJS.ProcessEnv = process.env,
): SecretProvider => {
  const secretId = env.DATABASE_SECRET_ID;

  if (secretId) {
    return new SecretsManagerSecretProvider(secretId);
  }

  return new EnvironmentSecretProvider();
};
