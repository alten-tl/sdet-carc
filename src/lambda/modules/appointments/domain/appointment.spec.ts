import { Appointment } from './appointment';
import { AppointmentAlreadyCancelledError } from './errors';

const buildAppointment = (
  status: 'HABILITADA' | 'DESHABILITADA' = 'HABILITADA',
): Appointment =>
  new Appointment({
    id: '44444444-4444-4444-8444-444444444444',
    clientId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    date: '2026-01-20',
    time: '10:00',
    startsAt: new Date('2026-01-20T16:00:00.000Z'),
    endsAt: new Date('2026-01-20T17:00:00.000Z'),
    status,
    comments: 'First visit',
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
  });

describe('Appointment', () => {
  it('is enabled when its status is HABILITADA', () => {
    expect(buildAppointment().isEnabled).toBe(true);
  });

  it('is not enabled when its status is DESHABILITADA', () => {
    expect(buildAppointment('DESHABILITADA').isEnabled).toBe(false);
  });

  describe('reschedule', () => {
    it('moves the appointment to the new slot', () => {
      const rescheduled = buildAppointment().reschedule(
        {
          date: '2026-01-21',
          time: '15:00',
          startsAt: new Date('2026-01-21T21:00:00.000Z'),
          endsAt: new Date('2026-01-21T22:00:00.000Z'),
        },
        new Date('2026-01-15T08:00:00.000Z'),
      );

      expect(rescheduled.date).toBe('2026-01-21');
      expect(rescheduled.time).toBe('15:00');
      expect(rescheduled.startsAt.toISOString()).toBe(
        '2026-01-21T21:00:00.000Z',
      );
      expect(rescheduled.endsAt.toISOString()).toBe('2026-01-21T22:00:00.000Z');
    });

    it('keeps the identity, the client, the vehicle and the comments', () => {
      const appointment = buildAppointment();
      const rescheduled = appointment.reschedule(
        {
          date: '2026-01-21',
          time: '15:00',
          startsAt: new Date('2026-01-21T21:00:00.000Z'),
          endsAt: new Date('2026-01-21T22:00:00.000Z'),
        },
        new Date('2026-01-15T08:00:00.000Z'),
      );

      expect(rescheduled.id).toBe(appointment.id);
      expect(rescheduled.clientId).toBe(appointment.clientId);
      expect(rescheduled.vehicleId).toBe(appointment.vehicleId);
      expect(rescheduled.comments).toBe(appointment.comments);
      expect(rescheduled.status).toBe('HABILITADA');
    });

    it('updates the update date and keeps the creation date', () => {
      const appointment = buildAppointment();
      const rescheduled = appointment.reschedule(
        {
          date: '2026-01-21',
          time: '15:00',
          startsAt: new Date('2026-01-21T21:00:00.000Z'),
          endsAt: new Date('2026-01-21T22:00:00.000Z'),
        },
        new Date('2026-01-15T08:00:00.000Z'),
      );

      expect(rescheduled.updatedAt.toISOString()).toBe(
        '2026-01-15T08:00:00.000Z',
      );
      expect(rescheduled.createdAt.toISOString()).toBe(
        '2026-01-10T12:00:00.000Z',
      );
    });

    it('does not modify the original appointment', () => {
      const appointment = buildAppointment();

      appointment.reschedule(
        {
          date: '2026-01-21',
          time: '15:00',
          startsAt: new Date('2026-01-21T21:00:00.000Z'),
          endsAt: new Date('2026-01-21T22:00:00.000Z'),
        },
        new Date('2026-01-15T08:00:00.000Z'),
      );

      expect(appointment.date).toBe('2026-01-20');
      expect(appointment.time).toBe('10:00');
      expect(appointment.updatedAt.toISOString()).toBe(
        '2026-01-10T12:00:00.000Z',
      );
    });

    it('fails when the appointment is already cancelled', () => {
      expect(() =>
        buildAppointment('DESHABILITADA').reschedule(
          {
            date: '2026-01-21',
            time: '15:00',
            startsAt: new Date('2026-01-21T21:00:00.000Z'),
            endsAt: new Date('2026-01-21T22:00:00.000Z'),
          },
          new Date('2026-01-15T08:00:00.000Z'),
        ),
      ).toThrow(AppointmentAlreadyCancelledError);
    });
  });
});
