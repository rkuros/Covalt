import { randomUUID } from 'crypto';

/**
 * BusinessHourId - Value Object
 * Uniquely identifies a business hour setting.
 */
export class BusinessHourId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): BusinessHourId {
    if (!value || value.trim().length === 0) {
      throw new Error('BusinessHourId must not be null or empty');
    }
    return new BusinessHourId(value);
  }

  static generate(): BusinessHourId {
    return new BusinessHourId(randomUUID());
  }

  equals(other: BusinessHourId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
