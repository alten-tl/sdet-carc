import {
  CommandEnvelopeSchema,
  CommandResultSchema,
} from './command-contracts';

describe('command contracts', () => {
  it('accepts a command envelope', () => {
    const result = CommandEnvelopeSchema.safeParse({
      type: 'appointments.list',
      payload: { date: '2026-01-20' },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a command envelope without a type', () => {
    const result = CommandEnvelopeSchema.safeParse({ payload: {} });

    expect(result.success).toBe(false);
  });

  it('accepts a successful result', () => {
    const result = CommandResultSchema.safeParse({
      ok: true,
      data: { items: [] },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a failed result with an error code', () => {
    const result = CommandResultSchema.safeParse({
      ok: false,
      error: {
        code: 'SLOT_NOT_AVAILABLE',
        message: 'The requested time slot is already taken.',
        details: { date: '2026-01-20' },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a result that is neither successful nor failed', () => {
    const result = CommandResultSchema.safeParse({ data: {} });

    expect(result.success).toBe(false);
  });
});
