/**
 * DayOfWeek - Value Object (enum-based)
 * Represents a day of the week.
 */
export enum DayOfWeekEnum {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

const ALL_DAYS = new Set(Object.values(DayOfWeekEnum));

export class DayOfWeek {
  readonly value: DayOfWeekEnum;

  private constructor(value: DayOfWeekEnum) {
    this.value = value;
  }

  static create(value: DayOfWeekEnum): DayOfWeek {
    if (!ALL_DAYS.has(value)) {
      throw new Error(`DayOfWeek must be one of ${[...ALL_DAYS].join(', ')}, got "${value}"`);
    }
    return new DayOfWeek(value);
  }

  equals(other: DayOfWeek): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
