import { randomUUID } from 'crypto';

/**
 * SlotId - Value Object
 * Uniquely identifies a slot.
 */
export class SlotId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): SlotId {
    if (!value || value.trim().length === 0) {
      throw new Error('SlotId must not be null or empty');
    }
    return new SlotId(value);
  }

  static generate(): SlotId {
    return new SlotId(randomUUID());
  }

  equals(other: SlotId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
