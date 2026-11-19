import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { getTestContext } from '../support/app-context';
import { insertClient, insertVehicle } from '../support/test-database';
import type { AppointmentWorld } from '../support/world';

const scheduleAppointment = async (
  world: AppointmentWorld,
  body: Record<string, unknown>,
): Promise<void> => {
  const { app } = getTestContext();

  const response = await request(app.getHttpServer())
    .post('/api/v1/appointments')
    .send(body);

  world.response = {
    status: response.status,
    body: response.body as Record<string, unknown>,
    contentType: response.headers['content-type'] ?? '',
  };
};

Given(
  'a client with the time zone {string}',
  async function (this: AppointmentWorld, timezone: string) {
    const { dataSource } = getTestContext();
    this.clientId = await insertClient(dataSource, timezone);
  },
);

Given('a vehicle', async function (this: AppointmentWorld) {
  const { dataSource } = getTestContext();
  this.vehicleId = await insertVehicle(dataSource);
});

Given(
  'an appointment scheduled on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    await scheduleAppointment(this, {
      clientId: this.clientId,
      vehicleId: this.vehicleId,
      date,
      time,
    });
  },
);

When(
  'the client schedules an appointment on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    await scheduleAppointment(this, {
      clientId: this.clientId,
      vehicleId: this.vehicleId,
      date,
      time,
    });
  },
);

When(
  'a client with id {string} schedules an appointment on {string} at {string}',
  async function (
    this: AppointmentWorld,
    clientId: string,
    date: string,
    time: string,
  ) {
    await scheduleAppointment(this, {
      clientId,
      vehicleId: this.vehicleId,
      date,
      time,
    });
  },
);

When(
  'the client schedules an appointment on {string} at {string} with an unknown vehicle',
  async function (this: AppointmentWorld, date: string, time: string) {
    await scheduleAppointment(this, {
      clientId: this.clientId,
      vehicleId: '99999999-9999-4999-8999-999999999999',
      date,
      time,
    });
  },
);

When(
  'the client schedules an appointment on {string} at {string} with an invalid payload',
  async function (this: AppointmentWorld, date: string, time: string) {
    await scheduleAppointment(this, {
      clientId: 'not-a-uuid',
      vehicleId: this.vehicleId,
      date,
      time,
    });
  },
);

When(
  'the appointments of {string} are listed',
  async function (this: AppointmentWorld, date: string) {
    const { app } = getTestContext();

    const response = await request(app.getHttpServer()).get(
      `/api/v1/appointments?date=${date}`,
    );

    this.response = {
      status: response.status,
      body: response.body as Record<string, unknown>,
      contentType: response.headers['content-type'] ?? '',
    };
  },
);

Then(
  'the response status is {int}',
  function (this: AppointmentWorld, status: number) {
    expect(this.response?.status).toBe(status);
  },
);

Then(
  'the response error code is {string}',
  function (this: AppointmentWorld, code: string) {
    expect(this.response?.body.code).toBe(code);
  },
);

Then(
  'the appointment status is {string}',
  function (this: AppointmentWorld, status: string) {
    expect(this.response?.body.status).toBe(status);
  },
);

Then(
  'the appointment is stored from {string} to {string}',
  async function (this: AppointmentWorld, startsAt: string, endsAt: string) {
    const { dataSource } = getTestContext();

    const rows = (await dataSource.query(
      'SELECT starts_at, ends_at FROM appointments ORDER BY created_at DESC LIMIT 1',
    )) as { starts_at: Date; ends_at: Date }[];

    expect(rows).toHaveLength(1);
    expect(new Date(rows[0].starts_at).toISOString()).toBe(startsAt);
    expect(new Date(rows[0].ends_at).toISOString()).toBe(endsAt);
  },
);

Then(
  'the response contains {int} appointments',
  function (this: AppointmentWorld, count: number) {
    const items = this.response?.body.items as unknown[];

    expect(items).toHaveLength(count);
  },
);

Then(
  'the appointments are listed in time order',
  function (this: AppointmentWorld) {
    const items = this.response?.body.items as { time: string }[];

    const times = items.map((item) => item.time);

    expect(times).toEqual([...times].sort());
  },
);

Then(
  'the response content type is {string}',
  function (this: AppointmentWorld, contentType: string) {
    expect(this.response?.contentType).toContain(contentType);
  },
);

Then(
  'the problem type is {string}',
  function (this: AppointmentWorld, type: string) {
    expect(this.response?.body.type).toBe(type);
  },
);

Then(
  'the problem title is {string}',
  function (this: AppointmentWorld, title: string) {
    expect(this.response?.body.title).toBe(title);
  },
);

Then(
  'the problem status is {int}',
  function (this: AppointmentWorld, status: number) {
    expect(this.response?.body.status).toBe(status);
  },
);

Then(
  'the problem instance is {string}',
  function (this: AppointmentWorld, instance: string) {
    expect(this.response?.body.instance).toBe(instance);
  },
);

When(
  'two requests schedule an appointment on {string} at {string} at the same time',
  async function (this: AppointmentWorld, date: string, time: string) {
    const { app } = getTestContext();
    const body = {
      clientId: this.clientId,
      vehicleId: this.vehicleId,
      date,
      time,
    };

    const responses = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/appointments').send(body),
      request(app.getHttpServer()).post('/api/v1/appointments').send(body),
    ]);

    this.responses = responses.map((response) => ({
      status: response.status,
      body: response.body as Record<string, unknown>,
      contentType: response.headers['content-type'] ?? '',
    }));
    this.response = this.responses[0];
  },
);

Then(
  'exactly one response has status {int}',
  function (this: AppointmentWorld, status: number) {
    const matches = this.responses.filter(
      (response) => response.status === status,
    );

    expect(matches).toHaveLength(1);
  },
);

Then(
  'the other response has status {int}',
  function (this: AppointmentWorld, status: number) {
    const [first, second] = this.responses;
    const rejected = first.status === 201 ? second : first;

    expect(rejected.status).toBe(status);
  },
);

Then(
  'the rejected response error code is {string}',
  function (this: AppointmentWorld, code: string) {
    const [first, second] = this.responses;
    const rejected = first.status === 201 ? second : first;

    expect(rejected.body.code).toBe(code);
  },
);

Then(
  'only one appointment is stored on {string}',
  async function (this: AppointmentWorld, date: string) {
    const { dataSource } = getTestContext();

    const rows = (await dataSource.query(
      'SELECT COUNT(*)::int AS total FROM appointments WHERE appointment_date = $1',
      [date],
    )) as { total: number }[];

    expect(rows[0].total).toBe(1);
  },
);
