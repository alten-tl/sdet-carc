import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../../src/lambda/modules/appointments/infrastructure/persistence/datasource';

export const connectToDatabase = async (
  connectionUrl: string,
): Promise<DataSource> => {
  const dataSource = new DataSource(buildDataSourceOptions(connectionUrl));

  try {
    await dataSource.initialize();
  } catch (error) {
    throw new Error(
      `Could not connect to PostgreSQL at ${connectionUrl}. Cause: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return dataSource;
};

export const resetDatabase = async (dataSource: DataSource): Promise<void> => {
  await dataSource.query(
    'TRUNCATE TABLE appointments, clients, vehicles CASCADE',
  );
};

export const insertClient = async (
  dataSource: DataSource,
  timezone: string,
): Promise<string> => {
  const id = '11111111-1111-4111-8111-111111111111';

  await dataSource.query(
    `INSERT INTO clients (id, name, timezone, address) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET timezone = EXCLUDED.timezone`,
    [id, 'Ana Lopez', timezone, 'Av. Reforma 222, Mexico City'],
  );

  return id;
};

export const insertVehicle = async (
  dataSource: DataSource,
): Promise<string> => {
  const id = '22222222-2222-4222-8222-222222222222';

  await dataSource.query(
    `INSERT INTO vehicles (id, vin, plates, color, year, model) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET vin = EXCLUDED.vin`,
    [id, '3HGCM82633A004352', 'MXY-123-A', 'Blanco', 2022, 'Honda Civic'],
  );

  return id;
};
