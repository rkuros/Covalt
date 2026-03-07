/**
 * SlotId - Unit 3（スケジュール・空き枠管理）のスロットを参照する値オブジェクト
 *
 * null 不可・空文字不可。
 */
export class SlotId {
  private constructor(readonly value: string) {}

  static create(value: string): SlotId {
    if (!value || value.trim().length === 0) {
      throw new Error('SlotId must not be empty');
    }
    return new SlotId(value);
  }

  equals(other: SlotId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
