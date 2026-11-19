import type { SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';

export const zodToOpenApi = (
  schema: z.ZodType,
  io: 'input' | 'output' = 'input',
): SchemaObject => {
  const converted = z.toJSONSchema(schema, { io }) as Record<string, unknown>;
  delete converted.$schema;

  return converted as SchemaObject;
};
