import { randomUUID } from 'node:crypto';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import type { AppointmentStatus } from '@contracts/appointments/appointment-status';
import { getAppointmentsContainer } from '../../src/lambda/container';
import { Appointment } from '../../src/lambda/modules/appointments/domain/appointment';
import { TimeSlot } from '../../src/lambda/modules/appointments/domain/time-slot';
import { TypeOrmAppointmentRepository } from '../../src/lambda/modules/appointments/infrastructure/persistence/typeorm-appointment.repository';

export const TIME_ZONE = 'America/Mexico_City';
export const SLOT_DURATION_MINUTES = 60;

export const storeAppointment = async (
  clientId: string,
  vehicleId: string,
  date: string,
  time: string,
  status: AppointmentStatus = APPOINTMENT_STATUS.ENABLED,
): Promise<Appointment> => {
  const container = await getAppointmentsContainer();
  const repository = new TypeOrmAppointmentRepository(container.dataSource);
  const slot = TimeSlot.fromLocal(
    date,
    time,
    TIME_ZONE,
    SLOT_DURATION_MINUTES,
  );
  const now = new Date();

  const appointment = new Appointment({
    id: randomUUID(),
    clientId,
    vehicleId,
    date,
    time,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    status,
    comments: null,
    createdAt: now,
    updatedAt: now,
  });

  await repository.insert(appointment);

  return appointment;
};
