import { z } from 'zod';

export const PROBLEM_ERROR_SCHEMA = z.object({
  path: z.string(),
  message: z.string(),
});

export const PROBLEM_DETAILS_SCHEMA = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string().optional(),
  errors: z.array(PROBLEM_ERROR_SCHEMA).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ProblemError = z.infer<typeof PROBLEM_ERROR_SCHEMA>;
export type ProblemDetails = z.infer<typeof PROBLEM_DETAILS_SCHEMA>;
