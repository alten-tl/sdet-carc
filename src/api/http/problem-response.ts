import { PROBLEM_DETAILS_SCHEMA } from '@contracts/protocol/problem.schemas';
import { zodToOpenApi } from '@api/inbound/http/zod-openapi';

export const PROBLEM_MEDIA_TYPE = 'application/problem+json';

export const problemResponse = (description: string) => ({
  description,
  content: {
    [PROBLEM_MEDIA_TYPE]: {
      schema: zodToOpenApi(PROBLEM_DETAILS_SCHEMA),
    },
  },
});
