/**
 * CustomerName - オーナーが管理用に付与する顧客名 値オブジェクト
 */
export class CustomerName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): CustomerName {
    if (!value || value.trim().length === 0) {
      throw new Error('CustomerName must not be empty');
    }
    return new CustomerName(value.trim());
  }

  equals(other: CustomerName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
