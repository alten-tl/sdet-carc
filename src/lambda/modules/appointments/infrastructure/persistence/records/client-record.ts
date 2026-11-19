import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'clients' })
export class ClientRecord {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  timezone: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
