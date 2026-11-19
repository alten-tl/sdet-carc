import { z } from 'zod';
import { LOCAL_DATE_SCHEMA, LOCAL_TIME_SCHEMA } from './appointment.schemas';

export const LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA = z.object({
  date: LOCAL_DATE_SCHEMA,
});

export type ListAppointmentsByDatePayload = z.infer<
  typeof LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA
>;

export const CREATE_APPOINTMENT_PAYLOAD_SCHEMA = z.object({
  clientId: z.uuid(),
  vehicleId: z.uuid(),
  date: LOCAL_DATE_SCHEMA,
  time: LOCAL_TIME_SCHEMA,
  comments: z.string().max(500).optional(),
});

export type CreateAppointmentPayload = z.infer<
  typeof CREATE_APPOINTMENT_PAYLOAD_SCHEMA
>;

export const LIST_APPOINTMENTS_BY_DATE_COMMAND_SCHEMA = z.object({
  type: z.literal('appointments.list'),
  payload: LIST_APPOINTMENTS_BY_DATE_PAYLOAD_SCHEMA,
});

export const CREATE_APPOINTMENT_COMMAND_SCHEMA = z.object({
  type: z.literal('appointments.create'),
  payload: CREATE_APPOINTMENT_PAYLOAD_SCHEMA,
});

export const APPOINTMENTS_COMMAND_SCHEMA = z.discriminatedUnion('type', [
  LIST_APPOINTMENTS_BY_DATE_COMMAND_SCHEMA,
  CREATE_APPOINTMENT_COMMAND_SCHEMA,
]);

export type AppointmentsCommand = z.infer<typeof APPOINTMENTS_COMMAND_SCHEMA>;
