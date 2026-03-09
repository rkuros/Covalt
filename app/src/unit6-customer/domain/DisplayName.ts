/**
 * DisplayName - LINE の表示名 値オブジェクト（nullable）
 */
export class DisplayName {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): DisplayName {
    if (!value || value.trim().length === 0) {
      throw new Error('DisplayName must not be empty');
    }
    return new DisplayName(value.trim());
  }

  equals(other: DisplayName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
