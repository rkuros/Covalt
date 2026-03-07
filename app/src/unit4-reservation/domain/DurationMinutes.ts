/**
 * DurationMinutes - 施術にかかる所要時間を分単位で表す値オブジェクト
 *
 * 最小 15 分、最大 1440 分（24 時間）。
 */
export class DurationMinutes {
  static readonly MIN = 15;
  static readonly MAX = 1440;

  private constructor(readonly value: number) {}

  static create(value: number): DurationMinutes {
    if (!Number.isInteger(value)) {
      throw new Error(`DurationMinutes must be an integer: ${value}`);
    }
    if (value < DurationMinutes.MIN || value > DurationMinutes.MAX) {
      throw new Error(
        `DurationMinutes must be between ${DurationMinutes.MIN} and ${DurationMinutes.MAX}: ${value}`,
      );
    }
    return new DurationMinutes(value);
  }

  equals(other: DurationMinutes): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `${this.value}min`;
  }
}
