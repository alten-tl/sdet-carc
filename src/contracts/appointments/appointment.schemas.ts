import { z } from 'zod';
import { APPOINTMENT_STATUS } from './appointment-status';

export const LOCAL_DATE_SCHEMA = z.iso.date();
export const LOCAL_TIME_SCHEMA = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected a HH:mm local time');

export const APPOINTMENT_STATUS_SCHEMA = z.enum([
  APPOINTMENT_STATUS.ENABLED,
  APPOINTMENT_STATUS.DISABLED,
]);

export const AppointmentSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  vehicleId: z.uuid(),
  date: LOCAL_DATE_SCHEMA,
  time: LOCAL_TIME_SCHEMA,
  status: APPOINTMENT_STATUS_SCHEMA,
  comments: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type AppointmentDto = z.infer<typeof AppointmentSchema>;

export const AppointmentListSchema = z.object({
  items: z.array(AppointmentSchema),
});

export type AppointmentListDto = z.infer<typeof AppointmentListSchema>;
