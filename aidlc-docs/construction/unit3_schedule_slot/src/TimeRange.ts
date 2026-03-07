import { TimeOfDay } from './TimeOfDay';

/**
 * TimeRange - Value Object
 * Represents a time range with start and end times.
 * Used for business hours and slot time frames.
 */
export class TimeRange {
  readonly startTime: TimeOfDay;
  readonly endTime: TimeOfDay;

  private constructor(startTime: TimeOfDay, endTime: TimeOfDay) {
    this.startTime = startTime;
    this.endTime = endTime;
  }

  static create(startTime: TimeOfDay, endTime: TimeOfDay): TimeRange {
    if (!startTime.isBefore(endTime)) {
      throw new Error(
        `TimeRange startTime (${startTime}) must be before endTime (${endTime})`,
      );
    }
    return new TimeRange(startTime, endTime);
  }

  /** Checks whether this time range overlaps with another. */
  overlaps(other: TimeRange): boolean {
    return (
      this.startTime.toMinutes() < other.endTime.toMinutes() &&
      other.startTime.toMinutes() < this.endTime.toMinutes()
    );
  }

  /** Checks whether the given time is within this range (inclusive start, exclusive end). */
  contains(time: TimeOfDay): boolean {
    const t = time.toMinutes();
    return this.startTime.toMinutes() <= t && t < this.endTime.toMinutes();
  }

  /** Returns the duration in minutes. */
  durationInMinutes(): number {
    return this.endTime.toMinutes() - this.startTime.toMinutes();
  }

  equals(other: TimeRange): boolean {
    return this.startTime.equals(other.startTime) && this.endTime.equals(other.endTime);
  }

  toString(): string {
    return `${this.startTime.toString()}-${this.endTime.toString()}`;
  }
}
