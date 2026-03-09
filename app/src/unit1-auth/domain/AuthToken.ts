import { randomUUID } from 'crypto';

/**
 * 値オブジェクト: AuthToken
 * Bearer トークン文字列を表す。トークンの生成・解析に使われる。
 */
export class AuthToken {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * 既存のトークン文字列から生成する。
   */
  static create(value: string): AuthToken {
    if (!value || value.trim().length === 0) {
      throw new Error('トークンは必須です');
    }
    return new AuthToken(value.trim());
  }

  /**
   * 新しいランダムトークンを生成する。
   */
  static generate(): AuthToken {
    const token = randomUUID();
    return new AuthToken(token);
  }

  equals(other: AuthToken): boolean {
    return this.value === other.value;
  }
}
