/**
 * LINE ユーザーID の値オブジェクト。
 * 形式: ^U[0-9a-f]{32}$ を保証する不変オブジェクト。
 */
export class LineUserId {
  private static readonly PATTERN = /^U[0-9a-f]{32}$/;

  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): LineUserId {
    if (!LineUserId.PATTERN.test(value)) {
      throw new Error(
        `Invalid LineUserId format: "${value}". Must match ${LineUserId.PATTERN.source}`,
      );
    }
    return new LineUserId(value);
  }

  equals(other: LineUserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
