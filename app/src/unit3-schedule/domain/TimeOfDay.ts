/**
 * TimeOfDay - Value Object
 * Represents a time of day (HH:mm). Timezone is fixed to JST.
 */
export class TimeOfDay {
  readonly hour: number;
  readonly minute: number;

  private constructor(hour: number, minute: number) {
    this.hour = hour;
    this.minute = minute;
  }

  static create(hour: number, minute: number): TimeOfDay {
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      throw new Error(`TimeOfDay hour must be 0-23, got ${hour}`);
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      throw new Error(`TimeOfDay minute must be 0-59, got ${minute}`);
    }
    return new TimeOfDay(hour, minute);
  }

  static fromString(value: string): TimeOfDay {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) {
      throw new Error(`TimeOfDay must be in HH:mm format, got "${value}"`);
    }
    const [hour, minute] = value.split(':').map(Number);
    return TimeOfDay.create(hour, minute);
  }

  /** Returns total minutes from midnight. */
  toMinutes(): number {
    return this.hour * 60 + this.minute;
  }

  isBefore(other: TimeOfDay): boolean {
    return this.toMinutes() < other.toMinutes();
  }

  isAfter(other: TimeOfDay): boolean {
    return this.toMinutes() > other.toMinutes();
  }

  equals(other: TimeOfDay): boolean {
    return this.hour === other.hour && this.minute === other.minute;
  }

  toString(): string {
    const hh = String(this.hour).padStart(2, '0');
    const mm = String(this.minute).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
