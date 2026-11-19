import { AppointmentDto } from '@contracts/appointments';
import { Appointment } from '@lambda/modules/appointments/domain/appointment';

export const toAppointmentDto = (appointment: Appointment): AppointmentDto => ({
  id: appointment.id,
  clientId: appointment.clientId,
  vehicleId: appointment.vehicleId,
  date: appointment.date,
  time: appointment.time,
  status: appointment.status,
  comments: appointment.comments,
  createdAt: appointment.createdAt.toISOString(),
  updatedAt: appointment.updatedAt.toISOString(),
});
