/**
 * LineUserId - LINE プラットフォーム上のユーザー ID 値オブジェクト
 * フォーマット: "U" + 32桁の16進文字列
 */
export class LineUserId {
  private static readonly PATTERN = /^U[0-9a-f]{32}$/;

  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): LineUserId {
    if (!value || !LineUserId.PATTERN.test(value)) {
      throw new Error(
        `Invalid LineUserId format: "${value}". Expected "U" followed by 32 hex characters.`,
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
