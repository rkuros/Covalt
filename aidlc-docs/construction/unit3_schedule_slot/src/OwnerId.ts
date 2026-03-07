/**
 * OwnerId - Value Object
 * Uniquely identifies an owner. External context reference from Unit 1 (Auth).
 */
export class OwnerId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): OwnerId {
    if (!value || value.trim().length === 0) {
      throw new Error('OwnerId must not be null or empty');
    }
    return new OwnerId(value);
  }

  equals(other: OwnerId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
