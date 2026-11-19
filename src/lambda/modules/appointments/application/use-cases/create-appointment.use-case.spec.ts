import { Clock } from '@lambda/application/ports/clock.port';
import { IdGenerator } from '@lambda/application/ports/id-generator.port';
import { Appointment } from '../../domain/appointment';
import { Client } from '../../domain/client';
import {
  ClientNotFoundError,
  SlotNotAvailableError,
  VehicleNotFoundError,
} from '../../domain/errors';
import { SlotAvailabilityPolicy } from '../../domain/slot-availability.policy';
import { Vehicle } from '../../domain/vehicle';
import { AppointmentRepository } from '../ports/appointment-repository.port';
import { ClientRepository } from '../ports/client-repository.port';
import { VehicleRepository } from '../ports/vehicle-repository.port';
import { CreateAppointment } from './create-appointment.use-case';

const CLIENT = new Client({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ana Lopez',
  timezone: 'America/Mexico_City',
  address: 'Av. Reforma 222, Mexico City',
});

const VEHICLE = new Vehicle({
  id: '22222222-2222-4222-8222-222222222222',
  vin: '3HGCM82633A004352',
  plates: 'MXY-123-A',
  color: 'Blanco',
  year: 2022,
  model: 'Honda Civic',
});

const buildRepository = (
  existing: Appointment[] = [],
): AppointmentRepository & { inserted: Appointment[] } => {
  const inserted: Appointment[] = [];

  return {
    inserted,
    findByDate: jest.fn().mockResolvedValue(existing),
    findOverlapping: jest.fn().mockResolvedValue(existing),
    insert: jest.fn().mockImplementation(async (appointment: Appointment) => {
      inserted.push(appointment);
    }),
  };
};

const buildClock = (now: Date): Clock => ({ now: () => now });

const buildIdGenerator = (id: string): IdGenerator => ({ next: () => id });

const buildUseCase = (
  appointmentRepository: AppointmentRepository,
  clientRepository: ClientRepository = { findById: jest.fn().mockResolvedValue(CLIENT) },
  vehicleRepository: VehicleRepository = { findById: jest.fn().mockResolvedValue(VEHICLE) },
) =>
  new CreateAppointment(
    appointmentRepository,
    clientRepository,
    vehicleRepository,
    new SlotAvailabilityPolicy(),
    buildClock(new Date('2026-01-10T12:00:00.000Z')),
    buildIdGenerator('55555555-5555-4555-8555-555555555555'),
    { slotDurationMinutes: 60 },
  );

const PAYLOAD = {
  clientId: CLIENT.id,
  vehicleId: VEHICLE.id,
  date: '2026-01-20',
  time: '10:00',
};

describe('CreateAppointment', () => {
  it('schedules the appointment using the time zone of the client', async () => {
    const repository = buildRepository();

    const appointment = await buildUseCase(repository).execute(PAYLOAD);

    expect(appointment.id).toBe('55555555-5555-4555-8555-555555555555');
    expect(appointment.status).toBe('HABILITADA');
    expect(appointment.startsAt.toISOString()).toBe(
      '2026-01-20T16:00:00.000Z',
    );
    expect(appointment.endsAt.toISOString()).toBe('2026-01-20T17:00:00.000Z');
    expect(appointment.createdAt.toISOString()).toBe(
      '2026-01-10T12:00:00.000Z',
    );
    expect(repository.inserted).toHaveLength(1);
  });

  it('fails when the client does not exist', async () => {
    const repository = buildRepository();

    await expect(
      buildUseCase(repository, { findById: jest.fn().mockResolvedValue(null) }).execute(
        PAYLOAD,
      ),
    ).rejects.toThrow(ClientNotFoundError);
  });

  it('fails when the vehicle does not exist', async () => {
    const repository = buildRepository();

    await expect(
      buildUseCase(repository, undefined, {
        findById: jest.fn().mockResolvedValue(null),
      }).execute(PAYLOAD),
    ).rejects.toThrow(VehicleNotFoundError);
  });

  it('fails when the requested time slot is already taken', async () => {
    const overlapping = new Appointment({
      id: '33333333-3333-4333-8333-333333333333',
      clientId: CLIENT.id,
      vehicleId: VEHICLE.id,
      date: '2026-01-20',
      time: '10:30',
      startsAt: new Date('2026-01-20T16:30:00.000Z'),
      endsAt: new Date('2026-01-20T17:30:00.000Z'),
      status: 'HABILITADA',
      comments: null,
      createdAt: new Date('2026-01-10T12:00:00.000Z'),
      updatedAt: new Date('2026-01-10T12:00:00.000Z'),
    });
    const repository = buildRepository([overlapping]);

    await expect(buildUseCase(repository).execute(PAYLOAD)).rejects.toThrow(
      SlotNotAvailableError,
    );
    expect(repository.inserted).toHaveLength(0);
  });
});
