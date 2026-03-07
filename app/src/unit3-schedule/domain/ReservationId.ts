/**
 * ReservationId - Value Object
 * Identifies a reservation. External context reference from Unit 4 (Reservation).
 */
export class ReservationId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): ReservationId {
    if (!value || value.trim().length === 0) {
      throw new Error('ReservationId must not be null or empty');
    }
    return new ReservationId(value);
  }

  equals(other: ReservationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
