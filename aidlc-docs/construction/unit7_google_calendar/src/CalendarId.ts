/**
 * 値オブジェクト: CalendarId
 *
 * 連携対象の Google カレンダーを一意に識別する ID。
 * Google Calendar API が返すカレンダーID文字列をラップする。
 */
export class CalendarId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * ファクトリメソッド: 新しい CalendarId を生成する。
   */
  static create(value: string): CalendarId {
    if (!value || value.trim().length === 0) {
      throw new Error('CalendarId は空にできません');
    }
    return new CalendarId(value.trim());
  }

  equals(other: CalendarId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
