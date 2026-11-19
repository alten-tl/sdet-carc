import { DataSource } from 'typeorm';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { AppointmentRepository } from '@lambda/modules/appointments/application/ports/appointment-repository.port';
import { Appointment } from '@lambda/modules/appointments/domain/appointment';
import { SlotNotAvailableError } from '@lambda/modules/appointments/domain/errors';
import { TimeSlot } from '@lambda/modules/appointments/domain/time-slot';
import { AppointmentRecord } from './records/appointment-record';
import { isSlotOverlapViolation } from './postgres-errors';

export class TypeOrmAppointmentRepository implements AppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Appointment | null> {
    const row = await this.dataSource
      .getRepository(AppointmentRecord)
      .findOneBy({ id });

    return row ? this.toDomain(row) : null;
  }

  async findByDate(date: string): Promise<Appointment[]> {
    const rows = await this.dataSource
      .getRepository(AppointmentRecord)
      .createQueryBuilder('appointment')
      .where('appointment.appointment_date = :date', { date })
      .orderBy('appointment.start_time', 'ASC')
      .getMany();

    return rows.map((row) => this.toDomain(row));
  }

  async findOverlapping(
    slot: TimeSlot,
    excludeId?: string,
  ): Promise<Appointment[]> {
    const query = this.dataSource
      .getRepository(AppointmentRecord)
      .createQueryBuilder('appointment')
      .where('appointment.starts_at < :endsAt', { endsAt: slot.endsAt })
      .andWhere('appointment.ends_at > :startsAt', { startsAt: slot.startsAt })
      .andWhere('appointment.status = :status', {
        status: APPOINTMENT_STATUS.ENABLED,
      });

    if (excludeId) {
      query.andWhere('appointment.id != :excludeId', { excludeId });
    }

    const rows = await query.getMany();

    return rows.map((row) => this.toDomain(row));
  }

  async insert(appointment: Appointment): Promise<void> {
    try {
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
    } catch (error) {
      if (isSlotOverlapViolation(error)) {
        throw new SlotNotAvailableError({
          date: appointment.date,
          time: appointment.time,
        });
      }

      throw error;
    }
  }

  async update(appointment: Appointment): Promise<void> {
    try {
      await this.dataSource.getRepository(AppointmentRecord).update(
        { id: appointment.id },
        {
          appointmentDate: appointment.date,
          startTime: appointment.time,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          status: appointment.status,
          updatedAt: appointment.updatedAt,
        },
      );
    } catch (error) {
      if (isSlotOverlapViolation(error)) {
        throw new SlotNotAvailableError({
          date: appointment.date,
          time: appointment.time,
        });
      }

      throw error;
    }
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
