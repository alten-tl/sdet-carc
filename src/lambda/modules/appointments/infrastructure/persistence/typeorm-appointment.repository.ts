import { DataSource } from 'typeorm';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { AppointmentRepository } from '@lambda/modules/appointments/application/ports/appointment-repository.port';
import { Appointment } from '@lambda/modules/appointments/domain/appointment';
import { TimeSlot } from '@lambda/modules/appointments/domain/time-slot';
import { AppointmentRecord } from './records/appointment-record';

export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByDate(date: string): Promise<Appointment[]> {
    const rows = await this.dataSource
      .getRepository(AppointmentRecord)
      .createQueryBuilder('appointment')
      .where('appointment.appointment_date = :date', { date })
      .orderBy('appointment.start_time', 'ASC')
      .getMany();

    return rows.map((row) => this.toDomain(row));
  }

  async findOverlapping(slot: TimeSlot): Promise<Appointment[]> {
    const rows = await this.dataSource
      .getRepository(AppointmentRecord)
      .createQueryBuilder('appointment')
      .where('appointment.starts_at < :endsAt', { endsAt: slot.endsAt })
      .andWhere('appointment.ends_at > :startsAt', { startsAt: slot.startsAt })
      .andWhere('appointment.status = :status', {
        status: APPOINTMENT_STATUS.ENABLED,
      })
      .getMany();

    return rows.map((row) => this.toDomain(row));
  }

  async insert(appointment: Appointment): Promise<void> {
    await this.dataSource.getRepository(AppointmentRecord).insert({
      id: appointment.id,
      clientId: appointment.clientId,
      vehicleId: appointment.vehicleId,
      appointmentDate: appointment.date,
      startTime: appointment.time,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      comments: appointment.comments,
      status: appointment.status,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    });
  }

  private toDomain(row: AppointmentRecord): Appointment {
    return new Appointment({
      id: row.id,
      clientId: row.clientId,
      vehicleId: row.vehicleId,
      date: row.appointmentDate,
      time: row.startTime.slice(0, 5),
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      comments: row.comments,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
