import { z } from 'zod';
import { AppointmentSchema } from '@contracts/appointments';

export const AppointmentResponseSchema = AppointmentSchema.omit({});

export const AppointmentListResponseSchema = z.object({
  items: z.array(AppointmentResponseSchema),
});

export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;
export type AppointmentListResponse = z.infer<
  typeof AppointmentListResponseSchema
>;
