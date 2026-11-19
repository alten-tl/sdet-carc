import type {
  ProblemDetails,
  ProblemError,
} from '@contracts/protocol/problem.schemas';

export const PROBLEM_TYPE_BASE_URI = 'https://api.alten.com/problems';
export const PROBLEM_ABOUT_BLANK = 'about:blank';

export interface ProblemDefinition {
  status: number;
  title: string;
  type: string;
}

const problem = (
  slug: string,
  status: number,
  title: string,
): ProblemDefinition => ({
  status,
  title,
  type: `${PROBLEM_TYPE_BASE_URI}/${slug}`,
});

export const PROBLEM_DEFINITIONS = {
  INVALID_PAYLOAD: problem(
    'invalid-payload',
    400,
    'The request payload is not valid',
  ),
  REQUEST_FAILED: problem('request-failed', 400, 'The request could not be processed'),
  NOT_FOUND: problem('not-found', 404, 'The requested resource does not exist'),
  CLIENT_NOT_FOUND: problem('client-not-found', 404, 'The client does not exist'),
  VEHICLE_NOT_FOUND: problem('vehicle-not-found', 404, 'The vehicle does not exist'),
  APPOINTMENT_NOT_FOUND: problem(
    'appointment-not-found',
    404,
    'The appointment does not exist',
  ),
  SLOT_NOT_AVAILABLE: problem(
    'slot-not-available',
    409,
    'The time slot is already taken',
  ),
  APPOINTMENT_ALREADY_CANCELLED: problem(
    'appointment-already-cancelled',
    409,
    'The appointment is already cancelled',
  ),
  INVALID_UPSTREAM_RESPONSE: problem(
    'invalid-upstream-response',
    502,
    'The appointments service returned an invalid response',
  ),
  LAMBDA_INVOCATION_FAILED: problem(
    'lambda-invocation-failed',
    502,
    'The appointments service could not be reached',
  ),
  INTERNAL_ERROR: problem('internal-error', 500, 'Internal server error'),
} satisfies Record<string, ProblemDefinition>;

export type ProblemCode = keyof typeof PROBLEM_DEFINITIONS;

export class ApiProblem extends Error {
  constructor(
    readonly code: string,
    readonly detail: string,
    readonly details?: unknown,
  ) {
    super(detail);
    this.name = 'ApiProblem';
  }
}

const toProblemContext = (
  details: unknown,
): Record<string, unknown> | undefined => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return undefined;
  }

  const context = details as Record<string, unknown>;

  return Object.keys(context).length > 0 ? context : undefined;
};

export interface ProblemDetailsInput {
  code: string;
  detail: string;
  instance?: string;
  errors?: ProblemError[];
  details?: unknown;
  /**
   * Overrides the status of the problem definition. It is used when the
   * failure comes from the HTTP layer (an unknown route, a method that is not
   * allowed...) and the status carries more information than the code.
   */
  status?: number;
}

export const toProblemDetails = (
  input: ProblemDetailsInput,
): ProblemDetails => {
  const definition = PROBLEM_DEFINITIONS[input.code as ProblemCode];

  if (!definition) {
    return {
      type: PROBLEM_ABOUT_BLANK,
      title: 'Internal Server Error',
      status: 500,
      detail: input.detail,
      instance: input.instance,
      code: input.code,
    };
  }

  return {
    type: definition.type,
    title: definition.title,
    status: input.status ?? definition.status,
    detail: input.detail,
    instance: input.instance,
    code: input.code,
    errors: input.errors,
    context: toProblemContext(input.details),
  };
};
