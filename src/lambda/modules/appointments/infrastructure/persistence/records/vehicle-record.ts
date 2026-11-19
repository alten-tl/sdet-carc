import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'vehicles' })
export class VehicleRecord {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  vin: string;

  @Column({ type: 'varchar' })
  plates: string;

  @Column({ type: 'varchar' })
  color: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar' })
  model: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
