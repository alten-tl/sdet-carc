import { Appointment } from '../../domain/appointment';
import { TimeSlot } from '../../domain/time-slot';

export interface AppointmentRepository {
  findByDate(date: string): Promise<Appointment[]>;
  findOverlapping(slot: TimeSlot): Promise<Appointment[]>;
  insert(appointment: Appointment): Promise<void>;
}
