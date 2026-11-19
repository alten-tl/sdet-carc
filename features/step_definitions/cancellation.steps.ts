import { When } from '@cucumber/cucumber';
import request from 'supertest';
import { getTestContext } from '../support/app-context';
import type { AppointmentWorld } from '../support/world';

const cancel = async (
  world: AppointmentWorld,
  appointmentId: string,
): Promise<void> => {
  const { app } = getTestContext();

  const response = await request(app.getHttpServer()).delete(
    `/api/v1/appointments/${appointmentId}`,
  );

  world.response = {
    status: response.status,
    body: response.body as Record<string, unknown>,
    contentType: response.headers['content-type'] ?? '',
  };
};

When('the appointment is cancelled', async function (this: AppointmentWorld) {
  await cancel(this, this.appointmentId);
});

When(
  'the appointment is cancelled again',
  async function (this: AppointmentWorld) {
    await cancel(this, this.appointmentId);
  },
);

When(
  'the appointment {string} is cancelled',
  async function (this: AppointmentWorld, appointmentId: string) {
    await cancel(this, appointmentId);
  },
);
