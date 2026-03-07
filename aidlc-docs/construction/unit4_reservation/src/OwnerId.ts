/**
 * OwnerId - Unit 1（認証・アカウント管理）のオーナーを参照する値オブジェクト
 *
 * null 不可・空文字不可。
 */
export class OwnerId {
  private constructor(readonly value: string) {}

  static create(value: string): OwnerId {
    if (!value || value.trim().length === 0) {
      throw new Error('OwnerId must not be empty');
    }
    return new OwnerId(value);
  }

  equals(other: OwnerId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
