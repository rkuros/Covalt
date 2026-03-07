/**
 * LIFF SDK から取得したアクセストークンを表す値オブジェクト。
 * 検証前の値を型安全に扱う。
 */
export class LiffAccessToken {
  private constructor(public readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): LiffAccessToken {
    if (!value || value.trim().length === 0) {
      throw new Error("LiffAccessToken must not be empty");
    }
    return new LiffAccessToken(value);
  }

  equals(other: LiffAccessToken): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
