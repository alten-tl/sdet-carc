import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import type { z } from 'zod';
import {
  CommandEnvelope,
  CommandResultSchema,
} from '@contracts/protocol/command-contracts';
import { ApiError } from '@api/errors/error-catalog';
import { CommandGateway } from '@api/application/ports/command-gateway.port';

export interface AwsInvokeCommandGatewayOptions {
  functionName: string;
  region: string;
  endpoint?: string;
}

export class AwsInvokeCommandGateway implements CommandGateway {
  private readonly client: LambdaClient;

  constructor(private readonly options: AwsInvokeCommandGatewayOptions) {
    this.client = new LambdaClient({
      region: options.region,
      ...(options.endpoint
        ? {
            endpoint: options.endpoint,
            credentials: {
              accessKeyId: 'local-access-key-id',
              secretAccessKey: 'local-secret-access-key',
            },
          }
        : {}),
    });
  }

  async execute<TData>(
    command: CommandEnvelope,
    dataSchema: z.ZodType<TData>,
  ): Promise<TData> {
    const response = await this.invoke(command);

    const result = CommandResultSchema.safeParse(this.parsePayload(response));

    if (!result.success) {
      throw new ApiError(
        'INVALID_UPSTREAM_RESPONSE',
        'The appointments service returned an unreadable response.',
        result.error.issues,
      );
    }

    if (!result.data.ok) {
      throw new ApiError(
        result.data.error.code,
        result.data.error.message,
        result.data.error.details,
      );
    }

    const data = dataSchema.safeParse(result.data.data);

    if (!data.success) {
      throw new ApiError(
        'INVALID_UPSTREAM_RESPONSE',
        'The appointments service response does not match the expected contract.',
        data.error.issues,
      );
    }

    return data.data;
  }

  private async invoke(command: CommandEnvelope): Promise<Uint8Array> {
    try {
      const response = await this.client.send(
        new InvokeCommand({
          FunctionName: this.options.functionName,
          InvocationType: 'RequestResponse',
          Payload: Buffer.from(JSON.stringify(command)),
        }),
      );

      return response.Payload ?? new Uint8Array();
    } catch (error) {
      throw new ApiError(
        'LAMBDA_INVOCATION_FAILED',
        this.buildInvocationErrorMessage(error),
        error instanceof Error ? { name: error.name } : undefined,
      );
    }
  }

  private buildInvocationErrorMessage(error: unknown): string {
    const reason = error instanceof Error ? error.message : String(error);

    if (this.options.endpoint) {
      return `Could not reach the appointments function at ${this.options.endpoint}: ${reason}. Is the local Lambda runtime running (pnpm local:lambda)?`;
    }

    return `Could not invoke the ${this.options.functionName} function in ${this.options.region}: ${reason}. Check the AWS credentials and the function name.`;
  }

  private parsePayload(payload: Uint8Array): unknown {
    if (payload.length === 0) {
      return undefined;
    }

    const raw = Buffer.from(payload).toString('utf8');

    try {
      return JSON.parse(raw);
    } catch {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    }
  }
}
