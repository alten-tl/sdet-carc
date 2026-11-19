import { DataSource } from 'typeorm';
import { ListAppointmentsByDate } from '@lambda/modules/appointments/application/use-cases/list-appointments-by-date.use-case';
import { RescheduleAppointment } from '@lambda/modules/appointments/application/use-cases/reschedule-appointment.use-case';
import { CancelAppointment } from '@lambda/modules/appointments/application/use-cases/cancel-appointment.use-case';
import { CreateAppointment } from '@lambda/modules/appointments/application/use-cases/create-appointment.use-case';
import {
  buildDataSourceOptions,
  DEFAULT_POOL_SIZE,
} from '@lambda/modules/appointments/infrastructure/persistence/datasource';
import { TypeOrmAppointmentRepository } from '@lambda/modules/appointments/infrastructure/persistence/typeorm-appointment.repository';
import { TypeOrmClientRepository } from '@lambda/modules/appointments/infrastructure/persistence/typeorm-client.repository';
import { TypeOrmVehicleRepository } from '@lambda/modules/appointments/infrastructure/persistence/typeorm-vehicle.repository';
import { SlotAvailabilityPolicy } from '@lambda/modules/appointments/domain/slot-availability.policy';
import { SystemClock } from './infrastructure/system-clock';
import { UuidIdGenerator } from './infrastructure/uuid-id-generator';
import { createSecretProvider } from './config/secret-provider';

export interface AppointmentsContainer {
  dataSource: DataSource;
  listAppointmentsByDate: ListAppointmentsByDate;
  createAppointment: CreateAppointment;
  rescheduleAppointment: RescheduleAppointment;
  cancelAppointment: CancelAppointment;
}

const DEFAULT_SLOT_DURATION_MINUTES = 60;

export const createAppointmentsContainer = async (
  connectionUrl: string,
  slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
  poolSize = DEFAULT_POOL_SIZE,
): Promise<AppointmentsContainer> => {
  const dataSource = new DataSource(
    buildDataSourceOptions(connectionUrl, false, poolSize),
  );
  await dataSource.initialize();

  const appointmentRepository = new TypeOrmAppointmentRepository(dataSource);
  const clientRepository = new TypeOrmClientRepository(dataSource);
  const vehicleRepository = new TypeOrmVehicleRepository(dataSource);

  return {
    dataSource,
    listAppointmentsByDate: new ListAppointmentsByDate(appointmentRepository),
    createAppointment: new CreateAppointment(
      appointmentRepository,
      clientRepository,
      vehicleRepository,
      new SlotAvailabilityPolicy(),
      new SystemClock(),
      new UuidIdGenerator(),
      { slotDurationMinutes },
    ),
    rescheduleAppointment: new RescheduleAppointment(
      appointmentRepository,
      clientRepository,
      new SlotAvailabilityPolicy(),
      new SystemClock(),
      { slotDurationMinutes },
    ),
    cancelAppointment: new CancelAppointment(
      appointmentRepository,
      new SystemClock(),
    ),
  };
};

let containerPromise: Promise<AppointmentsContainer> | undefined;

export const getAppointmentsContainer = (): Promise<AppointmentsContainer> => {
  if (!containerPromise) {
    const slotDurationMinutes = Number(
      process.env.SLOT_DURATION_MINUTES ?? DEFAULT_SLOT_DURATION_MINUTES,
    );

    containerPromise = createSecretProvider()
      .getDatabaseUrl()
      .then((connectionUrl) =>
        createAppointmentsContainer(
          connectionUrl,
          slotDurationMinutes,
          Number(process.env.DB_POOL_SIZE ?? DEFAULT_POOL_SIZE),
        ),
      )
      .catch((error: unknown) => {
        containerPromise = undefined;
        throw error;
      });
  }

  return containerPromise;
};

export const disposeAppointmentsContainer = async (): Promise<void> => {
  const pending = containerPromise;
  containerPromise = undefined;

  if (!pending) {
    return;
  }

  const container = await pending.catch(() => undefined);
  await container?.dataSource.destroy();
};
