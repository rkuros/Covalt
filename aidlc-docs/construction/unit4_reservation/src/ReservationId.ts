/**
 * ReservationId - 予約を一意に識別する値オブジェクト
 *
 * UUID v4 形式。予約作成時にシステムが自動生成する。
 */
export class ReservationId {
  private static readonly UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(readonly value: string) {}

  static create(value: string): ReservationId {
    if (!value) {
      throw new Error('ReservationId must not be empty');
    }
    if (!ReservationId.UUID_V4_REGEX.test(value)) {
      throw new Error(`ReservationId must be a valid UUID v4: ${value}`);
    }
    return new ReservationId(value);
  }

  static generate(): ReservationId {
    return new ReservationId(crypto.randomUUID());
  }

  equals(other: ReservationId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
