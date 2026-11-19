import { PROBLEM_DETAILS_SCHEMA } from './problem.schemas';

describe('problem details contract', () => {
  it('accepts a complete problem document', () => {
    const result = PROBLEM_DETAILS_SCHEMA.safeParse({
      type: 'https://api.alten.com/problems/slot-not-available',
      title: 'The time slot is already taken',
      status: 409,
      detail: 'The requested time slot is already taken.',
      instance: '/api/v1/appointments',
      code: 'SLOT_NOT_AVAILABLE',
      context: { date: '2026-01-15', time: '10:00' },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a problem document with only the members required by the RFC', () => {
    const result = PROBLEM_DETAILS_SCHEMA.safeParse({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
    });

    expect(result.success).toBe(true);
  });

  it('accepts the field level errors of an invalid payload', () => {
    const result = PROBLEM_DETAILS_SCHEMA.safeParse({
      type: 'https://api.alten.com/problems/invalid-payload',
      title: 'The request payload is not valid',
      status: 400,
      detail: 'The request payload is not valid.',
      errors: [{ path: 'date', message: 'Invalid ISO date' }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a problem document without a status', () => {
    const result = PROBLEM_DETAILS_SCHEMA.safeParse({
      type: 'about:blank',
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred.',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a problem document with a non numeric status', () => {
    const result = PROBLEM_DETAILS_SCHEMA.safeParse({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 'four hundred',
      detail: 'An unexpected error occurred.',
    });

    expect(result.success).toBe(false);
  });
});
