import { Column, Entity, PrimaryColumn } from 'typeorm';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import type { AppointmentStatus } from '@contracts/appointments/appointment-status';

@Entity({ name: 'appointments' })
export class AppointmentRecord {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'client_id', type: 'uuid' })
  clientId: string;

  @Column({ name: 'vehicle_id', type: 'uuid' })
  vehicleId: string;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ name: 'comments', type: 'text', nullable: true })
  comments: string | null;

  @Column({
    type: 'enum',
    enumName: 'appointment_status',
    enum: Object.values(APPOINTMENT_STATUS),
  })
  status: AppointmentStatus;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
