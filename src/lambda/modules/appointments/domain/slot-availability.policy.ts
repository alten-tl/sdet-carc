import { Appointment } from './appointment';
import { TimeSlot } from './time-slot';

export class SlotAvailabilityPolicy {
  isAvailable(candidate: TimeSlot, existing: Appointment[]): boolean {
    return existing.every(
      (appointment) =>
        appointment.status !== 'HABILITADA' ||
        !candidate.overlaps(TimeSlot.fromUtc(appointment.startsAt, appointment.endsAt)),
    );
  }
}
