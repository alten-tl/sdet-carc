import { DataSource } from 'typeorm';
import { VehicleRepository } from '../../application/ports/vehicle-repository.port';
import { Vehicle } from '../../domain/vehicle';
import { VehicleRecord } from './records/vehicle-record';

export class TypeOrmVehicleRepository implements VehicleRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Vehicle | null> {
    const row = await this.dataSource
      .getRepository(VehicleRecord)
      .findOne({ where: { id } });

    if (!row) {
      return null;
    }

    return new Vehicle({
      id: row.id,
      vin: row.vin,
      plates: row.plates,
      color: row.color,
      year: row.year,
      model: row.model,
    });
  }
}
