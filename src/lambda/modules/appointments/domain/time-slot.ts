import { DateTime } from 'luxon';

export class InvalidTimeSlotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTimeSlotError';
  }
}

export class TimeSlot {
  readonly startsAt: Date;
  readonly endsAt: Date;

  private constructor(startsAt: Date, endsAt: Date) {
    this.startsAt = startsAt;
    this.endsAt = endsAt;
  }

  static fromUtc(startsAt: Date, endsAt: Date): TimeSlot {
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw new InvalidTimeSlotError(
        'The time slot must end after it starts.',
      );
    }

    return new TimeSlot(startsAt, endsAt);
  }

  static fromLocal(
    date: string,
    time: string,
    timeZone: string,
    durationMinutes: number,
  ): TimeSlot {
    if (durationMinutes <= 0) {
      throw new InvalidTimeSlotError(
        'The time slot must have a positive duration.',
      );
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);

    if (
      !year ||
      !month ||
      !day ||
      hour === undefined ||
      minute === undefined ||
      !Number.isFinite(hour) ||
      !Number.isFinite(minute)
    ) {
      throw new InvalidTimeSlotError(
        `Invalid local date and time: ${date} ${time}`,
      );
    }

    const localStart = DateTime.fromObject(
      { year, month, day, hour, minute },
      { zone: timeZone },
    );

    if (!localStart.isValid) {
      throw new InvalidTimeSlotError(
        `Invalid local time ${time} on ${date} for the time zone ${timeZone}.`,
      );
    }

    if (localStart.hour !== hour || localStart.minute !== minute) {
      throw new InvalidTimeSlotError(
        `The local time ${time} does not exist on ${date} in ${timeZone}.`,
      );
    }

    return new TimeSlot(
      localStart.toUTC().toJSDate(),
      localStart.plus({ minutes: durationMinutes }).toUTC().toJSDate(),
    );
  }

  overlaps(other: TimeSlot): boolean {
    return (
      this.startsAt.getTime() < other.endsAt.getTime() &&
      other.startsAt.getTime() < this.endsAt.getTime()
    );
  }
}
