import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'expect';
import { randomUUID } from 'node:crypto';
import { APPOINTMENT_STATUS } from '@contracts/appointments/appointment-status';
import { getAppointmentsContainer } from '../../src/lambda/container';
import { Appointment } from '../../src/lambda/modules/appointments/domain/appointment';
import { DomainError } from '../../src/lambda/modules/appointments/domain/errors';
import { TimeSlot } from '../../src/lambda/modules/appointments/domain/time-slot';
import { TypeOrmAppointmentRepository } from '../../src/lambda/modules/appointments/infrastructure/persistence/typeorm-appointment.repository';
import type { AppointmentWorld } from '../support/world';

const TIME_ZONE = 'America/Mexico_City';
const SLOT_DURATION_MINUTES = 60;

const buildAppointment = (
  clientId: string,
  vehicleId: string,
  date: string,
  time: string,
): Appointment => {
  const slot = TimeSlot.fromLocal(
    date,
    time,
    TIME_ZONE,
    SLOT_DURATION_MINUTES,
  );
  const now = new Date();

  return new Appointment({
    id: randomUUID(),
    clientId,
    vehicleId,
    date,
    time,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    status: APPOINTMENT_STATUS.ENABLED,
    comments: null,
    createdAt: now,
    updatedAt: now,
  });
};

const storeAppointment = async (
  world: AppointmentWorld,
  date: string,
  time: string,
): Promise<void> => {
  const container = await getAppointmentsContainer();
  const repository = new TypeOrmAppointmentRepository(container.dataSource);

  await repository.insert(
    buildAppointment(world.clientId, world.vehicleId, date, time),
  );
};

Given(
  'an enabled appointment stored on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    await storeAppointment(this, date, time);
  },
);

When(
  'another enabled appointment is stored on {string} at {string}',
  async function (this: AppointmentWorld, date: string, time: string) {
    try {
      await storeAppointment(this, date, time);
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
