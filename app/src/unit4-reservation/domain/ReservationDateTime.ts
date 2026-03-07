/**
 * ReservationDateTime - 予約の日時を表す値オブジェクト
 *
 * ISO 8601 形式のタイムゾーン付き日時を保持する。
 * 過去日時判定の比較ロジックを内包する。
 */
export class ReservationDateTime {
  private constructor(readonly value: Date) {}

  /**
   * ISO 8601 形式の文字列から生成する。
   * @example "2024-01-15T10:00:00+09:00"
   */
  static create(isoString: string): ReservationDateTime {
    if (!isoString) {
      throw new Error('ReservationDateTime must not be empty');
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${isoString}`);
    }
    return new ReservationDateTime(date);
  }

  /** Date オブジェクトから直接生成する。 */
  static fromDate(date: Date): ReservationDateTime {
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return new ReservationDateTime(new Date(date.getTime()));
  }

  /** 現在日時より過去であるかを判定する。 */
  isPast(now: Date = new Date()): boolean {
    return this.value.getTime() < now.getTime();
  }

  /** JST（+09:00）の ISO 8601 文字列として返す。 */
  toISOString(): string {
    const jstOffset = 9 * 60 * 60 * 1000;
    const jst = new Date(this.value.getTime() + jstOffset);
    const yyyy = jst.getUTCFullYear();
    const mm = String(jst.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(jst.getUTCDate()).padStart(2, '0');
    const hh = String(jst.getUTCHours()).padStart(2, '0');
    const min = String(jst.getUTCMinutes()).padStart(2, '0');
    const ss = String(jst.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+09:00`;
  }

  equals(other: ReservationDateTime): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  toString(): string {
    return this.toISOString();
  }
}
