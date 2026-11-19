import { TimeSlot } from './time-slot';

describe('TimeSlot', () => {
  it('converts a local time to UTC using the client time zone', () => {
    const slot = TimeSlot.fromLocal(
      '2026-01-15',
      '10:00',
      'America/Mexico_City',
      60,
    );

    expect(slot.startsAt.toISOString()).toBe('2026-01-15T16:00:00.000Z');
    expect(slot.endsAt.toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('honours the daylight saving offset of the time zone', () => {
    const slot = TimeSlot.fromLocal(
      '2026-07-15',
      '10:00',
      'America/New_York',
      60,
    );

    expect(slot.startsAt.toISOString()).toBe('2026-07-15T14:00:00.000Z');
  });

  it('rejects a local time that does not exist because of the daylight saving change', () => {
    expect(() =>
      TimeSlot.fromLocal('2026-03-08', '02:30', 'America/New_York', 60),
    ).toThrow('does not exist');
  });

  it('rejects a slot that does not have a positive duration', () => {
    expect(() =>
      TimeSlot.fromLocal('2026-01-15', '10:00', 'UTC', 0),
    ).toThrow('must have a positive duration');
  });

  it('rejects a utc slot that does not have a positive duration', () => {
    expect(() =>
      TimeSlot.fromUtc(
        new Date('2026-01-15T10:00:00.000Z'),
        new Date('2026-01-15T10:00:00.000Z'),
      ),
    ).toThrow('must end after it starts');
  });

  it('rejects a date that is not a valid local date', () => {
    expect(() =>
      TimeSlot.fromLocal('not-a-date', '10:00', 'UTC', 60),
    ).toThrow('Invalid local date and time');
  });

  it('rejects a time zone that does not exist', () => {
    expect(() =>
      TimeSlot.fromLocal('2026-01-15', '10:00', 'Not/AZone', 60),
    ).toThrow('Invalid local time');
  });

  it('detects overlapping slots', () => {
    const first = TimeSlot.fromLocal('2026-01-15', '10:00', 'UTC', 60);
    const overlapping = TimeSlot.fromLocal('2026-01-15', '10:30', 'UTC', 60);
    const contiguous = TimeSlot.fromLocal('2026-01-15', '11:00', 'UTC', 60);

    expect(first.overlaps(overlapping)).toBe(true);
    expect(overlapping.overlaps(first)).toBe(true);
    expect(first.overlaps(contiguous)).toBe(false);
    expect(contiguous.overlaps(first)).toBe(false);
  });
});
