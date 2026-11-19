import { Vehicle } from '../../domain/vehicle';

export interface VehicleRepository {
  findById(id: string): Promise<Vehicle | null>;
}
