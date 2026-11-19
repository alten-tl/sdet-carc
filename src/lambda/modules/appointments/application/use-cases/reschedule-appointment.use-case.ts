import { RescheduleAppointmentPayload } from '@contracts/appointments';
import { Clock } from '@lambda/application/ports/clock.port';
import { Appointment } from '../../domain/appointment';
import {
  AppointmentNotFoundError,
  ClientNotFoundError,
  SlotNotAvailableError,
} from '../../domain/errors';
import { SlotAvailabilityPolicy } from '../../domain/slot-availability.policy';
import { TimeSlot } from '../../domain/time-slot';
import { AppointmentRepository } from '../ports/appointment-repository.port';
import { ClientRepository } from '../ports/client-repository.port';

export interface RescheduleAppointmentOptions {
  slotDurationMinutes: number;
}

export class RescheduleAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clientRepository: ClientRepository,
    private readonly slotAvailabilityPolicy: SlotAvailabilityPolicy,
    private readonly clock: Clock,
    private readonly options: RescheduleAppointmentOptions,
  ) {}

  async execute(
    payload: RescheduleAppointmentPayload,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(payload.id);

    if (!appointment) {
      throw new AppointmentNotFoundError(payload.id);
    }

    const client = await this.clientRepository.findById(appointment.clientId);

    if (!client) {
      throw new ClientNotFoundError(appointment.clientId);
    }

    const date = payload.date ?? appointment.date;
    const time = payload.time ?? appointment.time;
    const slot = TimeSlot.fromLocal(
      date,
      time,
      client.timezone,
      this.options.slotDurationMinutes,
    );

    const overlapping = await this.appointmentRepository.findOverlapping(
      slot,
      appointment.id,
    );

    if (!this.slotAvailabilityPolicy.isAvailable(slot, overlapping)) {
      throw new SlotNotAvailableError({ date, time });
    }

    const rescheduled = appointment.reschedule(
      {
        date,
        time,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      },
      this.clock.now(),
    );

    await this.appointmentRepository.update(rescheduled);

    return rescheduled;
  }
}
