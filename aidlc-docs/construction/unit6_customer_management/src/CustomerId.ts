/**
 * CustomerId - 顧客を一意に識別する ID 値オブジェクト
 * 例: "cust-001"
 */
export class CustomerId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): CustomerId {
    if (!value || value.trim().length === 0) {
      throw new Error("CustomerId must not be empty");
    }
    return new CustomerId(value.trim());
  }

  static generate(): CustomerId {
    const uuid = crypto.randomUUID();
    return new CustomerId(`cust-${uuid}`);
  }

  equals(other: CustomerId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
