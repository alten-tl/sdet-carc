import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'expect';
import { Appointment } from '../../src/lambda/modules/appointments/domain/appointment';
import { SlotAvailabilityPolicy } from '../../src/lambda/modules/appointments/domain/slot-availability.policy';
import { TimeSlot } from '../../src/lambda/modules/appointments/domain/time-slot';

const SLOT_DATE = '2026-01-20';

const buildSlot = (from: string, to: string): TimeSlot =>
  TimeSlot.fromUtc(
    new Date(`${SLOT_DATE}T${from}:00.000Z`),
    new Date(`${SLOT_DATE}T${to}:00.000Z`),
  );

const buildAppointment = (
  from: string,
  to: string,
  status: 'HABILITADA' | 'DESHABILITADA',
): Appointment =>
  new Appointment({
    id: '33333333-3333-4333-8333-333333333333',
    clientId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    date: SLOT_DATE,
    time: from,
    startsAt: new Date(`${SLOT_DATE}T${from}:00.000Z`),
    endsAt: new Date(`${SLOT_DATE}T${to}:00.000Z`),
    status,
    comments: null,
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
  });

interface SlotAvailabilityState {
  candidate: TimeSlot;
  existing: Appointment[];
  available: boolean;
}

const state: SlotAvailabilityState = {
  candidate: buildSlot('10:00', '11:00'),
  existing: [],
  available: true,
};

Given(
  'an enabled appointment from {string} to {string}',
  function (from: string, to: string) {
    state.existing = [buildAppointment(from, to, 'HABILITADA')];
  },
);

Given(
  'a disabled appointment from {string} to {string}',
  function (from: string, to: string) {
    state.existing = [buildAppointment(from, to, 'DESHABILITADA')];
  },
);

When(
  'the availability of the slot from {string} to {string} is evaluated',
  function (from: string, to: string) {
    state.candidate = buildSlot(from, to);
    state.available = new SlotAvailabilityPolicy().isAvailable(
      state.candidate,
      state.existing,
    );
  },
);

Then('the slot is available', function () {
  expect(state.available).toBe(true);
});

Then('the slot is not available', function () {
  expect(state.available).toBe(false);
});
