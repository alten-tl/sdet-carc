import { Appointment } from './appointment';
import { SlotAvailabilityPolicy } from './slot-availability.policy';
import { TimeSlot } from './time-slot';

const buildAppointment = (
  startsAt: string,
  endsAt: string,
  status: 'HABILITADA' | 'DESHABILITADA' = 'HABILITADA',
): Appointment =>
  new Appointment({
    id: '33333333-3333-4333-8333-333333333333',
    clientId: '11111111-1111-4111-8111-111111111111',
    vehicleId: '22222222-2222-4222-8222-222222222222',
    date: '2026-01-15',
    time: '10:00',
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    status,
    comments: null,
    createdAt: new Date('2026-01-10T12:00:00.000Z'),
    updatedAt: new Date('2026-01-10T12:00:00.000Z'),
  });

describe('SlotAvailabilityPolicy', () => {
  const policy = new SlotAvailabilityPolicy();
  const candidate = TimeSlot.fromLocal('2026-01-15', '10:00', 'UTC', 60);

  it('is available when there are no appointments on that window', () => {
    expect(policy.isAvailable(candidate, [])).toBe(true);
  });

  it('is not available when an enabled appointment overlaps the slot', () => {
    const existing = [
      buildAppointment('2026-01-15T10:30:00.000Z', '2026-01-15T11:30:00.000Z'),
    ];

    expect(policy.isAvailable(candidate, existing)).toBe(false);
  });

  it('is available when the existing appointment is contiguous', () => {
    const existing = [
      buildAppointment('2026-01-15T11:00:00.000Z', '2026-01-15T12:00:00.000Z'),
    ];

    expect(policy.isAvailable(candidate, existing)).toBe(true);
  });

  it('is available when the overlapping appointment is disabled', () => {
    const existing = [
      buildAppointment(
        '2026-01-15T10:30:00.000Z',
        '2026-01-15T11:30:00.000Z',
        'DESHABILITADA',
      ),
    ];

    expect(policy.isAvailable(candidate, existing)).toBe(true);
  });

  it('knows whether an appointment is enabled', () => {
    expect(buildAppointment('2026-01-15T10:30:00.000Z', '2026-01-15T11:30:00.000Z').isEnabled).toBe(true);
    expect(
      buildAppointment(
        '2026-01-15T10:30:00.000Z',
        '2026-01-15T11:30:00.000Z',
        'DESHABILITADA',
      ).isEnabled,
    ).toBe(false);
  });
});
