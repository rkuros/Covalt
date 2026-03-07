/**
 * Duration - Value Object
 * Represents a duration in minutes. Used for slot length.
 * Min: 15 minutes, Max: 1440 minutes (24 hours).
 */
export class Duration {
  readonly minutes: number;

  private constructor(minutes: number) {
    this.minutes = minutes;
  }

  static create(minutes: number): Duration {
    if (!Number.isInteger(minutes)) {
      throw new Error(`Duration must be an integer, got ${minutes}`);
    }
    if (minutes < 15) {
      throw new Error(`Duration must be at least 15 minutes, got ${minutes}`);
    }
    if (minutes > 1440) {
      throw new Error(`Duration must be at most 1440 minutes, got ${minutes}`);
    }
    return new Duration(minutes);
  }

  equals(other: Duration): boolean {
    return this.minutes === other.minutes;
  }

  toString(): string {
    return `${this.minutes}min`;
  }
}
