import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { getTestContext } from '../support/app-context';
import { storeAppointment } from '../support/appointment-store';
import type { AppointmentWorld } from '../support/world';

const reschedule = async (
  world: AppointmentWorld,
  appointmentId: string,
  body: Record<string, unknown>,
): Promise<void> => {
  const { app } = getTestContext();

  const response = await request(app.getHttpServer())
    .patch(`/api/v1/appointments/${appointmentId}`)
    .send(body);

  world.response = {
    status: response.status,
    body: response.body as Record<string, unknown>,
    contentType: response.headers['content-type'] ?? '',
  };
};

Given(
  'a cancelled appointment stored on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    const appointment = await storeAppointment(
      this.clientId,
      this.vehicleId,
      date,
      time,
      APPOINTMENT_STATUS.DISABLED,
    );

    this.appointmentId = appointment.id;
  },
);

When(
  'the appointment is rescheduled to {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    await reschedule(this, this.appointmentId, { date, time });
  },
);

When(
  'the appointment is rescheduled to the date {string}',
  async function (this: AppointmentWorld, date: string) {
    await reschedule(this, this.appointmentId, { date });
  },
);

When(
  'the appointment is rescheduled to the time {string}',
  async function (this: AppointmentWorld, time: string) {
    await reschedule(this, this.appointmentId, { time });
  },
);

When(
  'the appointment is rescheduled without a date and without a time',
  async function (this: AppointmentWorld) {
    await reschedule(this, this.appointmentId, {});
  },
);

When(
  'the appointment {string} is rescheduled to {string} at {string}',
  async function (
    this: AppointmentWorld,
    appointmentId: string,
    date: string,
    time: string,
  ) {
    await reschedule(this, appointmentId, { date, time });
  },
);

Then(
  'the appointment date is {string}',
  function (this: AppointmentWorld, date: string) {
    expect(this.response?.body.date).toBe(date);
  },
);

Then(
  'the appointment time is {string}',
  function (this: AppointmentWorld, time: string) {
    expect(this.response?.body.time).toBe(time);
  },
);
