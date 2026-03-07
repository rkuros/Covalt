/**
 * 値オブジェクト: EmailAddress
 * メールアドレスの形式バリデーションを保証する。
 */
export class EmailAddress {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): EmailAddress {
    if (!value || value.trim().length === 0) {
      throw new Error("メールアドレスは必須です");
    }
    const trimmed = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error("メールアドレスの形式が不正です");
    }
    return new EmailAddress(trimmed);
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }
}
