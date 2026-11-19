export const ERROR_HTTP_STATUS = {
  INVALID_PAYLOAD: 422,
  INVALID_REQUEST: 400,
  INVALID_UPSTREAM_RESPONSE: 502,
  LAMBDA_INVOCATION_FAILED: 502,
  APPOINTMENT_NOT_FOUND: 404,
  SLOT_NOT_AVAILABLE: 409,
  CLIENT_NOT_FOUND: 404,
  VEHICLE_NOT_FOUND: 404,
  APPOINTMENT_ALREADY_CANCELLED: 409,
  REQUEST_FAILED: 400,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get status(): number {
    return ERROR_HTTP_STATUS[this.code as ErrorCode] ?? 500;
  }
}
