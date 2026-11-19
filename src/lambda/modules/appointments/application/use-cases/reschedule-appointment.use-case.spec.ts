import { Clock } from '@lambda/application/ports/clock.port';
import { Appointment } from '../../domain/appointment';
import { Client } from '../../domain/client';
import {
  AppointmentAlreadyCancelledError,
  AppointmentNotFoundError,
  ClientNotFoundError,
  SlotNotAvailableError,
} from '../../domain/errors';
import { SlotAvailabilityPolicy } from '../../domain/slot-availability.policy';
import { AppointmentRepository } from '../ports/appointment-repository.port';
import { ClientRepository } from '../ports/client-repository.port';
import { RescheduleAppointment } from './reschedule-appointment.use-case';

const CLIENT = new Client({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana Lopez',
  timezone: 'America/Mexico_City',
  address: 'Av. Reforma 222, Mexico City',
});

const APPOINTMENT = new Appointment({
  id: '44444444-4444-4444-8444-444444444444',
  clientId: CLIENT.id,
  vehicleId: '22222222-2222-4222-8222-222222222222',
  date: '2026-01-20',
  time: '10:00',
  startsAt: new Date('2026-01-20T16:00:00.000Z'),
  endsAt: new Date('2026-01-20T17:00:00.000Z'),
  status: 'HABILITADA',
  comments: null,
  createdAt: new Date('2026-01-10T12:00:00.000Z'),
  updatedAt: new Date('2026-01-10T12:00:00.000Z'),
});

const buildRepository = (
  appointment: Appointment | null = APPOINTMENT,
  overlapping: Appointment[] = [],
): AppointmentRepository & {
  updated: Appointment[];
  excludedIds: (string | undefined)[];
} => {
  const updated: Appointment[] = [];
  const excludedIds: (string | undefined)[] = [];

  return {
    updated,
    excludedIds,
    findById: jest.fn().mockResolvedValue(appointment),
    findByDate: jest.fn().mockResolvedValue([]),
    findOverlapping: jest.fn().mockImplementation(
      async (_slot: unknown, excludeId?: string) => {
        excludedIds.push(excludeId);

        return overlapping;
      },
    ),
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockImplementation(async (value: Appointment) => {
      updated.push(value);
    }),
  };
};

const buildUseCase = (
  appointmentRepository: AppointmentRepository,
  clientRepository: ClientRepository = {
    findById: jest.fn().mockResolvedValue(CLIENT),
  },
) =>
  new RescheduleAppointment(
    appointmentRepository,
    clientRepository,
    new SlotAvailabilityPolicy(),
    { now: () => new Date('2026-01-15T08:00:00.000Z') } as Clock,
    { slotDurationMinutes: 60 },
  );

const PAYLOAD = {
  id: APPOINTMENT.id,
  date: '2026-01-21',
  time: '15:00',
};

describe('RescheduleAppointment', () => {
  it('moves the appointment to the new slot using the time zone of the client', async () => {
    const repository = buildRepository();

    const rescheduled = await buildUseCase(repository).execute(PAYLOAD);

    expect(rescheduled.date).toBe('2026-01-21');
    expect(rescheduled.time).toBe('15:00');
    expect(rescheduled.startsAt.toISOString()).toBe(
      '2026-01-21T21:00:00.000Z',
    );
    expect(rescheduled.endsAt.toISOString()).toBe('2026-01-21T22:00:00.000Z');
  });

  it('keeps the current time when only a date is given', async () => {
    const repository = buildRepository();

    const rescheduled = await buildUseCase(repository).execute({
      id: APPOINTMENT.id,
      date: '2026-01-21',
    });

    expect(rescheduled.time).toBe('10:00');
    expect(rescheduled.startsAt.toISOString()).toBe(
      '2026-01-21T16:00:00.000Z',
    );
  });

  it('keeps the current date when only a time is given', async () => {
    const repository = buildRepository();

    const rescheduled = await buildUseCase(repository).execute({
      id: APPOINTMENT.id,
      time: '15:00',
    });

    expect(rescheduled.date).toBe('2026-01-20');
    expect(rescheduled.startsAt.toISOString()).toBe(
      '2026-01-20T21:00:00.000Z',
    );
  });

  it('updates the update date of the appointment', async () => {
    const repository = buildRepository();

    const rescheduled = await buildUseCase(repository).execute(PAYLOAD);

    expect(rescheduled.updatedAt.toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
    expect(rescheduled.createdAt.toISOString()).toBe(
      '2026-01-10T12:00:00.000Z',
    );
  });

  it('excludes the appointment itself from the overlapping search', async () => {
    const repository = buildRepository();

    await buildUseCase(repository).execute(PAYLOAD);

    expect(repository.excludedIds).toEqual([APPOINTMENT.id]);
  });

  it('stores the rescheduled appointment', async () => {
    const repository = buildRepository();

    await buildUseCase(repository).execute(PAYLOAD);

    expect(repository.updated).toHaveLength(1);
    expect(repository.updated[0].date).toBe('2026-01-21');
  });

  it('fails when the appointment does not exist', async () => {
    const repository = buildRepository(null);

    await expect(buildUseCase(repository).execute(PAYLOAD)).rejects.toThrow(
      AppointmentNotFoundError,
    );
    expect(repository.updated).toHaveLength(0);
  });

  it('fails when the client of the appointment does not exist', async () => {
    const repository = buildRepository();

    await expect(
      buildUseCase(repository, {
        findById: jest.fn().mockResolvedValue(null),
      }).execute(PAYLOAD),
    ).rejects.toThrow(ClientNotFoundError);
    expect(repository.updated).toHaveLength(0);
  });

  it('fails when the new time slot is already taken', async () => {
    const taken = new Appointment({
      id: '33333333-3333-4333-8333-333333333333',
      clientId: CLIENT.id,
      vehicleId: '22222222-2222-4222-8222-222222222222',
      date: '2026-01-21',
      time: '15:30',
      startsAt: new Date('2026-01-21T21:30:00.000Z'),
      endsAt: new Date('2026-01-21T22:30:00.000Z'),
      status: 'HABILITADA',
      comments: null,
      createdAt: new Date('2026-01-10T12:00:00.000Z'),
      updatedAt: new Date('2026-01-10T12:00:00.000Z'),
    });
    const repository = buildRepository(APPOINTMENT, [taken]);

    await expect(buildUseCase(repository).execute(PAYLOAD)).rejects.toThrow(
      SlotNotAvailableError,
    );
    expect(repository.updated).toHaveLength(0);
  });

  it('fails when the appointment is already cancelled', async () => {
    const cancelled = new Appointment({
      id: APPOINTMENT.id,
      clientId: APPOINTMENT.clientId,
      vehicleId: APPOINTMENT.vehicleId,
      date: APPOINTMENT.date,
      time: APPOINTMENT.time,
      startsAt: APPOINTMENT.startsAt,
      endsAt: APPOINTMENT.endsAt,
      status: 'DESHABILITADA',
      comments: APPOINTMENT.comments,
      createdAt: APPOINTMENT.createdAt,
      updatedAt: APPOINTMENT.updatedAt,
    });
    const repository = buildRepository(cancelled);

    await expect(buildUseCase(repository).execute(PAYLOAD)).rejects.toThrow(
      AppointmentAlreadyCancelledError,
    );
    expect(repository.updated).toHaveLength(0);
  });
});
