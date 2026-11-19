import type { z } from 'zod';
import type { CommandEnvelope } from '@contracts/protocol/command-contracts';

export const COMMAND_GATEWAY = Symbol('COMMAND_GATEWAY');

export interface CommandGateway {
  execute<TData>(
    command: CommandEnvelope,
    dataSchema: z.ZodType<TData>,
  ): Promise<TData>;
}
