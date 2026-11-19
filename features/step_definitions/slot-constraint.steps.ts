import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'expect';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { DomainError } from '../../src/lambda/modules/appointments/domain/errors';
import { storeAppointment } from '../support/appointment-store';
import type { AppointmentWorld } from '../support/world';

Given(
  'an enabled appointment stored on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    await storeAppointment(this.clientId, this.vehicleId, date, time);
  },
);

When(
  'another enabled appointment is stored on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    try {
      await storeAppointment(this.clientId, this.vehicleId, date, time);
      this.storedError = undefined;
    } catch (error) {
      this.storedError = error;
    }
  },
);

Then(
  'the second appointment is rejected with the code {string}',
  function (this: AppointmentWorld, code: string) {
    expect(this.storedError).toBeInstanceOf(DomainError);
    expect((this.storedError as DomainError).code).toBe(code);
  },
);

Then('the second appointment is stored', function (this: AppointmentWorld) {
  expect(this.storedError).toBeUndefined();
});

export const storeCancelledAppointment = async (
  world: AppointmentWorld,
  date: string,
  time: string,
): Promise<void> => {
  await storeAppointment(
    world.clientId,
    world.vehicleId,
    date,
    time,
    APPOINTMENT_STATUS.DISABLED,
  );
};
