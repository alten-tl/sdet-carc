import { z } from 'zod';
import { ApiErrorSchema } from './error.schemas';

export const CommandEnvelopeSchema = z.object({
  type: z.string(),
  payload: z.unknown(),
});

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;

export const CommandResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({ ok: z.literal(false), error: ApiErrorSchema }),
]);

export type CommandResult = z.infer<typeof CommandResultSchema>;
