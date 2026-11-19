import { Appointment } from '../../domain/appointment';
import { TimeSlot } from '../../domain/time-slot';

export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findByDate(date: string): Promise<Appointment[]>;
  findOverlapping(slot: TimeSlot, excludeId?: string): Promise<Appointment[]>;
  insert(appointment: Appointment): Promise<void>;
  update(appointment: Appointment): Promise<void>;
}
