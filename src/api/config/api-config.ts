import { z } from 'zod';

export const API_CONFIG = 'API_CONFIG';

const API_CONFIG_SCHEMA = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  AWS_REGION: z.string().default('us-east-1'),
  LAMBDA_FUNCTION_NAME: z.string().default('appointments'),
  LAMBDA_ENDPOINT: z.string().url().optional(),
});

export interface ApiConfig {
  port: number;
  awsRegion: string;
  lambdaFunctionName: string;
  lambdaEndpoint?: string;
}

export const loadLocalEnv = (): void => {
  try {
    process.loadEnvFile();
  } catch {
    return;
  }
};

export const loadApiConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ApiConfig => {
  const parsed = API_CONFIG_SCHEMA.parse(env);

  return {
    port: parsed.PORT,
    awsRegion: parsed.AWS_REGION,
    lambdaFunctionName: parsed.LAMBDA_FUNCTION_NAME,
    lambdaEndpoint: parsed.LAMBDA_ENDPOINT,
  };
};
