import { ListAppointmentsByDatePayload } from '@contracts/appointments';
import { Appointment } from '../../domain/appointment';
import { AppointmentRepository } from '../ports/appointment-repository.port';

export class ListAppointmentsByDate {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(payload: ListAppointmentsByDatePayload): Promise<Appointment[]> {
    return this.appointmentRepository.findByDate(payload.date);
  }
}
