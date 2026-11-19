import { Clock } from '@lambda/application/ports/clock.port';
import { Appointment } from '../../domain/appointment';
import {
  AppointmentAlreadyCancelledError,
  AppointmentNotFoundError,
} from '../../domain/errors';
import { AppointmentRepository } from '../ports/appointment-repository.port';
import { CancelAppointment } from './cancel-appointment.use-case';

const APPOINTMENT = new Appointment({
  id: '44444444-4444-4444-8444-444444444444',
  clientId: '11111111-1111-4111-8111-111111111111',
  vehicleId: '22222222-2222-4222-8222-222222222222',
  date: '2026-01-20',
  time: '10:00',
  startsAt: new Date('2026-01-20T16:00:00.000Z'),
  endsAt: new Date('2026-01-20T17:00:00.000Z'),
  status: 'HABILITADA',
  comments: 'First visit',
  createdAt: new Date('2026-01-10T12:00:00.000Z'),
  updatedAt: new Date('2026-01-10T12:00:00.000Z'),
});

const buildRepository = (
  appointment: Appointment | null = APPOINTMENT,
): AppointmentRepository & { updated: Appointment[] } => {
  const updated: Appointment[] = [];

  return {
    updated,
    findById: jest.fn().mockResolvedValue(appointment),
    findByDate: jest.fn().mockResolvedValue([]),
    findOverlapping: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockImplementation(async (value: Appointment) => {
      updated.push(value);
    }),
  };
};

const buildUseCase = (appointmentRepository: AppointmentRepository) =>
  new CancelAppointment(appointmentRepository, {
    now: () => new Date('2026-01-15T08:00:00.000Z'),
  } as Clock);

describe('CancelAppointment', () => {
  it('disables the appointment', async () => {
    const repository = buildRepository();

    const cancelled = await buildUseCase(repository).execute({
      id: APPOINTMENT.id,
    });

    expect(cancelled.status).toBe('DESHABILITADA');
    expect(cancelled.isEnabled).toBe(false);
  });

  it('updates the update date and keeps the creation date', async () => {
    const repository = buildRepository();

    const cancelled = await buildUseCase(repository).execute({
      id: APPOINTMENT.id,
    });

    expect(cancelled.updatedAt.toISOString()).toBe(
      '2026-01-15T08:00:00.000Z',
    );
    expect(cancelled.createdAt.toISOString()).toBe(
      '2026-01-10T12:00:00.000Z',
    );
  });

  it('keeps the slot of the appointment', async () => {
    const repository = buildRepository();

    const cancelled = await buildUseCase(repository).execute({
      id: APPOINTMENT.id,
    });

    expect(cancelled.date).toBe('2026-01-20');
    expect(cancelled.time).toBe('10:00');
    expect(cancelled.startsAt.toISOString()).toBe(
      '2026-01-20T16:00:00.000Z',
    );
  });

  it('stores the cancelled appointment', async () => {
    const repository = buildRepository();

    await buildUseCase(repository).execute({ id: APPOINTMENT.id });

    expect(repository.updated).toHaveLength(1);
    expect(repository.updated[0].status).toBe('DESHABILITADA');
  });

  it('fails when the appointment does not exist', async () => {
    const repository = buildRepository(null);

    await expect(
      buildUseCase(repository).execute({ id: APPOINTMENT.id }),
    ).rejects.toThrow(AppointmentNotFoundError);
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

    await expect(
      buildUseCase(repository).execute({ id: APPOINTMENT.id }),
    ).rejects.toThrow(AppointmentAlreadyCancelledError);
    expect(repository.updated).toHaveLength(0);
  });
});
