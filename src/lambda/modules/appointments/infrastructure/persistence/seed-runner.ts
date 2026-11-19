import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './datasource';

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const VEHICLE_ID = '22222222-2222-4222-8222-222222222222';

const SEED_STATEMENTS = [
  `TRUNCATE TABLE appointments, clients, vehicles CASCADE`,
  `INSERT INTO clients (id, name, timezone, address) VALUES
     ('${CLIENT_ID}', 'Ana Lopez', 'America/Mexico_City', 'Av. Reforma 222, Mexico City')`,
  `INSERT INTO vehicles (id, vin, plates, color, year, model) VALUES
     ('${VEHICLE_ID}', '3HGCM82633A004352', 'MXY-123-A', 'Blanco', 2022, 'Honda Civic')`,
  `INSERT INTO appointments (id, client_id, vehicle_id, appointment_date, start_time, starts_at, ends_at, comments, status) VALUES
     ('33333333-3333-4333-8333-333333333333', '${CLIENT_ID}', '${VEHICLE_ID}', '2026-01-15', '10:00', '2026-01-15 16:00:00+00', '2026-01-15 17:00:00+00', 'First visit', 'HABILITADA'),
     ('44444444-4444-4444-8444-444444444444', '${CLIENT_ID}', '${VEHICLE_ID}', '2026-01-15', '11:30', '2026-01-15 17:30:00+00', '2026-01-15 18:30:00+00', 'Follow up visit', 'HABILITADA'),
     ('55555555-5555-4555-8555-555555555555', '${CLIENT_ID}', '${VEHICLE_ID}', '2026-01-16', '09:00', '2026-01-16 15:00:00+00', '2026-01-16 16:00:00+00', 'Cancelled by the client', 'DESHABILITADA')`,
];

export const runSeed = async (connectionUrl: string): Promise<void> => {
  const dataSource = new DataSource(buildDataSourceOptions(connectionUrl));

  await dataSource.initialize();

  try {
    for (const statement of SEED_STATEMENTS) {
      await dataSource.query(statement);
    }
  } finally {
    await dataSource.destroy();
  }
};
