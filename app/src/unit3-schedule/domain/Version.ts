/**
 * Version - Value Object
 * Optimistic locking version number.
 */
export class Version {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): Version {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Version must be a non-negative integer, got ${value}`);
    }
    return new Version(value);
  }

  static initial(): Version {
    return new Version(0);
  }

  increment(): Version {
    return new Version(this.value + 1);
  }

  equals(other: Version): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return String(this.value);
  }
}
