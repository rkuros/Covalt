import { DayOfWeek, DayOfWeekEnum } from './DayOfWeek';

/**
 * SlotDate - Value Object
 * Represents a date in YYYY-MM-DD format (JST).
 */
export class SlotDate {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): SlotDate {
    if (!value || value.trim().length === 0) {
      throw new Error('SlotDate must not be null or empty');
    }
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(value)) {
      throw new Error('SlotDate must be in YYYY-MM-DD format');
    }
    // Validate the date is real
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      throw new Error(`SlotDate is not a valid date: ${value}`);
    }
    return new SlotDate(value);
  }

  getDayOfWeek(): DayOfWeek {
    const [year, month, day] = this.value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const jsDayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ...
    const mapping: DayOfWeekEnum[] = [
      DayOfWeekEnum.SUNDAY,
      DayOfWeekEnum.MONDAY,
      DayOfWeekEnum.TUESDAY,
      DayOfWeekEnum.WEDNESDAY,
      DayOfWeekEnum.THURSDAY,
      DayOfWeekEnum.FRIDAY,
      DayOfWeekEnum.SATURDAY,
    ];
    return DayOfWeek.create(mapping[jsDayOfWeek]);
  }

  equals(other: SlotDate): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
