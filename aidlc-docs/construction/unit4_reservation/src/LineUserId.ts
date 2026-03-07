/**
 * LineUserId - LINE プラットフォームのユーザー識別子を表す値オブジェクト
 *
 * 形式: `U` + 32桁の16進数（例: U1234567890abcdef1234567890abcdef）
 * null 許容（LINE 未連携の場合）。non-null の場合は形式バリデーションを行う。
 */
export class LineUserId {
  private static readonly PATTERN = /^U[0-9a-f]{32}$/;

  private constructor(readonly value: string) {}

  /**
   * 文字列から生成する。null/undefined の場合は null を返す。
   */
  static create(value: string | null | undefined): LineUserId | null {
    if (value == null || value === '') {
      return null;
    }
    if (!LineUserId.PATTERN.test(value)) {
      throw new Error(
        `LineUserId must match pattern U + 32 hex characters: ${value}`,
      );
    }
    return new LineUserId(value);
  }

  equals(other: LineUserId | null): boolean {
    if (other === null) return false;
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
