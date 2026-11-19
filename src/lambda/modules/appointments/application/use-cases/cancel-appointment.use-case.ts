import { CancelAppointmentPayload } from '@contracts/appointments';
import { Clock } from '@lambda/application/ports/clock.port';
import { Appointment } from '../../domain/appointment';
import { AppointmentNotFoundError } from '../../domain/errors';
import { AppointmentRepository } from '../ports/appointment-repository.port';

export class CancelAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clock: Clock,
  ) {}

  async execute(payload: CancelAppointmentPayload): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(payload.id);

    if (!appointment) {
      throw new AppointmentNotFoundError(payload.id);
    }

    const cancelled = appointment.cancel(this.clock.now());

    await this.appointmentRepository.update(cancelled);

    return cancelled;
  }
}
