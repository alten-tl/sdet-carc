export const APPOINTMENT_STATUS = {
  ENABLED: 'HABILITADA',
  DISABLED: 'DESHABILITADA',
} as const;

export type AppointmentStatus =
  (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];
