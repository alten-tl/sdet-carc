import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { CreateAppointmentPayload } from '@contracts/appointments';
import { Clock } from '@lambda/application/ports/clock.port';
import { IdGenerator } from '@lambda/application/ports/id-generator.port';
import { Appointment } from '../../domain/appointment';
import {
  ClientNotFoundError,
  SlotNotAvailableError,
  VehicleNotFoundError,
} from '../../domain/errors';
import { SlotAvailabilityPolicy } from '../../domain/slot-availability.policy';
import { TimeSlot } from '../../domain/time-slot';
import { AppointmentRepository } from '../ports/appointment-repository.port';
import { ClientRepository } from '../ports/client-repository.port';
import { VehicleRepository } from '../ports/vehicle-repository.port';

export interface CreateAppointmentOptions {
  slotDurationMinutes: number;
}

export class CreateAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clientRepository: ClientRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly slotAvailabilityPolicy: SlotAvailabilityPolicy,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly options: CreateAppointmentOptions,
  ) {}

  async execute(payload: CreateAppointmentPayload): Promise<Appointment> {
    const client = await this.clientRepository.findById(payload.clientId);

    if (!client) {
      throw new ClientNotFoundError(payload.clientId);
    }

    const vehicle = await this.vehicleRepository.findById(payload.vehicleId);

    if (!vehicle) {
      throw new VehicleNotFoundError(payload.vehicleId);
    }

    const slot = TimeSlot.fromLocal(
      payload.date,
      payload.time,
      client.timezone,
      this.options.slotDurationMinutes,
    );

    const overlapping = await this.appointmentRepository.findOverlapping(slot);

    if (!this.slotAvailabilityPolicy.isAvailable(slot, overlapping)) {
      throw new SlotNotAvailableError({
        date: payload.date,
        time: payload.time,
      });
    }

    const now = this.clock.now();

    const appointment = new Appointment({
      id: this.idGenerator.next(),
      clientId: client.id,
      vehicleId: vehicle.id,
      date: payload.date,
      time: payload.time,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: APPOINTMENT_STATUS.ENABLED,
      comments: payload.comments ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.appointmentRepository.insert(appointment);

    return appointment;
  }
}
