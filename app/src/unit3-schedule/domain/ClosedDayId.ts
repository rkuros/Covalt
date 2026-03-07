import { randomUUID } from 'crypto';

/**
 * ClosedDayId - Value Object
 * Uniquely identifies a closed day setting.
 */
export class ClosedDayId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): ClosedDayId {
    if (!value || value.trim().length === 0) {
      throw new Error('ClosedDayId must not be null or empty');
    }
    return new ClosedDayId(value);
  }

  static generate(): ClosedDayId {
    return new ClosedDayId(randomUUID());
  }

  equals(other: ClosedDayId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
