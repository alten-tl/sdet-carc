import {
  APPOINTMENTS_COMMAND_SCHEMA,
  CREATE_APPOINTMENT_PAYLOAD_SCHEMA,
  LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA,
  RESCHEDULE_APPOINTMENT_REQUEST_SCHEMA,
} from './commands.schemas';

describe('appointments command contracts', () => {
  describe('appointments.list', () => {
    it('accepts a command with an ISO date', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.list',
        payload: { date: '2026-01-20' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a command with a date that is not an ISO date', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.list',
        payload: { date: '20-01-2026' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a command without a payload', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.list',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('appointments.create', () => {
    const validPayload = {
      clientId: '11111111-1111-4111-8111-111111111111',
      vehicleId: '22222222-2222-4222-8222-222222222222',
      date: '2026-01-20',
      time: '10:00',
    };

    it('accepts a command with the mandatory fields', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.create',
        payload: validPayload,
      });

      expect(result.success).toBe(true);
    });

    it('accepts a command with optional comments', () => {
      const result = CREATE_APPOINTMENT_PAYLOAD_SCHEMA.safeParse({
        ...validPayload,
        comments: 'First visit',
      });

      expect(result.success).toBe(true);
    });

    it('rejects a client id that is not a uuid', () => {
      const result = CREATE_APPOINTMENT_PAYLOAD_SCHEMA.safeParse({
        ...validPayload,
        clientId: 'not-a-uuid',
      });

      expect(result.success).toBe(false);
    });

    it('rejects a time that is not a HH:mm local time', () => {
      const result = CREATE_APPOINTMENT_PAYLOAD_SCHEMA.safeParse({
        ...validPayload,
        time: '25:00',
      });

      expect(result.success).toBe(false);
    });

    it('rejects comments longer than the allowed length', () => {
      const result = CREATE_APPOINTMENT_PAYLOAD_SCHEMA.safeParse({
        ...validPayload,
        comments: 'a'.repeat(501),
      });

      expect(result.success).toBe(false);
    });
  });

  describe('appointments.reschedule', () => {
    const validPayload = {
      id: '44444444-4444-4444-8444-444444444444',
      date: '2026-01-20',
      time: '11:00',
    };

    it('accepts a command with a new date and time', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.reschedule',
        payload: validPayload,
      });

      expect(result.success).toBe(true);
    });

    it('accepts a command that only moves the appointment to another date', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.reschedule',
        payload: { id: validPayload.id, date: '2026-01-21' },
      });

      expect(result.success).toBe(true);
    });

    it('accepts a command that only moves the appointment to another time', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.reschedule',
        payload: { id: validPayload.id, time: '11:00' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a command without a date and without a time', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.reschedule',
        payload: { id: validPayload.id },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a command with an appointment id that is not a uuid', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.reschedule',
        payload: { ...validPayload, id: 'not-a-uuid' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a command with a time that is not a HH:mm local time', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.reschedule',
        payload: { ...validPayload, time: '25:00' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('appointments.cancel', () => {
    it('accepts a command with an appointment id', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.cancel',
        payload: { id: '44444444-4444-4444-8444-444444444444' },
      });

      expect(result.success).toBe(true);
    });

    it('rejects a command with an appointment id that is not a uuid', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.cancel',
        payload: { id: 'not-a-uuid' },
      });

      expect(result.success).toBe(false);
    });

    it('rejects a command without a payload', () => {
      const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
        type: 'appointments.cancel',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('the reschedule request', () => {
    it('accepts a request with a date', () => {
      const result = RESCHEDULE_APPOINTMENT_REQUEST_SCHEMA.safeParse({
        date: '2026-01-21',
      });

      expect(result.success).toBe(true);
    });

    it('accepts a request with a time', () => {
      const result = RESCHEDULE_APPOINTMENT_REQUEST_SCHEMA.safeParse({
        time: '15:00',
      });

      expect(result.success).toBe(true);
    });

    it('rejects a request without a date and without a time', () => {
      const result = RESCHEDULE_APPOINTMENT_REQUEST_SCHEMA.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  it('rejects an unknown command', () => {
    const result = APPOINTMENTS_COMMAND_SCHEMA.safeParse({
      type: 'appointments.destroy',
      payload: {},
    });

    expect(result.success).toBe(false);
  });

  it('exposes the payload schema of the list command', () => {
    expect(
      LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA.safeParse({
        date: '2026-01-20',
      }).success,
    ).toBe(true);
  });
});
