/**
 * CustomerId - Unit 6（顧客情報管理）の顧客を参照する値オブジェクト
 *
 * null 不可・空文字不可。
 */
export class CustomerId {
  private constructor(readonly value: string) {}

  static create(value: string): CustomerId {
    if (!value || value.trim().length === 0) {
      throw new Error('CustomerId must not be empty');
    }
    return new CustomerId(value);
  }

  equals(other: CustomerId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
