import { DataSourceOptions } from 'typeorm';
import { AddAppointmentSlotOverlapConstraint1700000003000 } from './migrations/1700000003000-AddAppointmentSlotOverlapConstraint';
import { CreateAppointmentsTable1700000002000 } from './migrations/1700000002000-CreateAppointmentsTable';
import { CreateClientsTable1700000000000 } from './migrations/1700000000000-CreateClientsTable';
import { CreateVehiclesTable1700000001000 } from './migrations/1700000001000-CreateVehiclesTable';

export const APPOINTMENTS_MIGRATIONS = [
  CreateClientsTable1700000000000,
  CreateVehiclesTable1700000001000,
  CreateAppointmentsTable1700000002000,
  AddAppointmentSlotOverlapConstraint1700000003000,
];

export const buildDataSourceOptions = (
  connectionUrl: string,
  logging = false,
): DataSourceOptions => ({
  type: 'postgres',
  url: connectionUrl,
  entities: [],
  migrations: APPOINTMENTS_MIGRATIONS,
  migrationsTableName: 'migrations',
  synchronize: false,
  logging,
});
