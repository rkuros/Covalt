/**
 * OwnerId - 顧客が所属するオーナーの ID 値オブジェクト
 */
export class OwnerId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): OwnerId {
    if (!value || value.trim().length === 0) {
      throw new Error("OwnerId must not be empty");
    }
    return new OwnerId(value.trim());
  }

  equals(other: OwnerId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
