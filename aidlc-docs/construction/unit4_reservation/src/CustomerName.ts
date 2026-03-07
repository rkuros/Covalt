/**
 * CustomerName - 顧客名を表す値オブジェクト
 *
 * 予約作成時のスナップショットとして保持される。
 * null 不可・空文字不可。
 */
export class CustomerName {
  private constructor(readonly value: string) {}

  static create(value: string): CustomerName {
    if (!value || value.trim().length === 0) {
      throw new Error('CustomerName must not be empty');
    }
    return new CustomerName(value);
  }

  equals(other: CustomerName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
