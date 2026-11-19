import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { AppointmentStatus } from '@contracts/appointments/appointment-status';
import { AppointmentAlreadyCancelledError } from './errors';

export interface AppointmentProps {
  id: string;
  clientId: string;
  vehicleId: string;
  date: string;
  time: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppointmentSlot {
  date: string;
  time: string;
  startsAt: Date;
  endsAt: Date;
}

export class Appointment {
  readonly id: string;
  readonly clientId: string;
  readonly vehicleId: string;
  readonly date: string;
  readonly time: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: AppointmentStatus;
  readonly comments: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AppointmentProps) {
    this.id = props.id;
    this.clientId = props.clientId;
    this.vehicleId = props.vehicleId;
    this.date = props.date;
    this.time = props.time;
    this.startsAt = props.startsAt;
    this.endsAt = props.endsAt;
    this.status = props.status;
    this.comments = props.comments;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isEnabled(): boolean {
    return this.status === 'HABILITADA';
  }

  reschedule(slot: AppointmentSlot, updatedAt: Date): Appointment {
    if (!this.isEnabled) {
      throw new AppointmentAlreadyCancelledError(this.id);
    }

    return new Appointment({
      id: this.id,
      clientId: this.clientId,
      vehicleId: this.vehicleId,
      date: slot.date,
      time: slot.time,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      status: this.status,
      comments: this.comments,
      createdAt: this.createdAt,
      updatedAt,
    });
  }

  cancel(updatedAt: Date): Appointment {
    if (!this.isEnabled) {
      throw new AppointmentAlreadyCancelledError(this.id);
    }

    return new Appointment({
      id: this.id,
      clientId: this.clientId,
      vehicleId: this.vehicleId,
      date: this.date,
      time: this.time,
      startsAt: this.startsAt,
      endsAt: this.endsAt,
      status: APPOINTMENT_STATUS.DISABLED,
      comments: this.comments,
      createdAt: this.createdAt,
      updatedAt,
    });
  }
}
