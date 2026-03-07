/**
 * 値オブジェクト: CalendarEventDetail
 *
 * Google カレンダーに登録する予定の内容を表す不変オブジェクト。
 * タイトル、開始日時、終了日時、説明を保持する。
 */
export class CalendarEventDetail {
  readonly title: string;
  readonly startDateTime: Date;
  readonly endDateTime: Date;
  readonly description: string;

  private constructor(title: string, startDateTime: Date, endDateTime: Date, description: string) {
    this.title = title;
    this.startDateTime = startDateTime;
    this.endDateTime = endDateTime;
    this.description = description;
  }

  /**
   * ファクトリメソッド: 新しい CalendarEventDetail を生成する。
   */
  static create(
    title: string,
    startDateTime: Date,
    endDateTime: Date,
    description: string,
  ): CalendarEventDetail {
    if (!title || title.trim().length === 0) {
      throw new Error('タイトルは必須です');
    }
    if (!(startDateTime instanceof Date) || isNaN(startDateTime.getTime())) {
      throw new Error('開始日時は有効な日付である必要があります');
    }
    if (!(endDateTime instanceof Date) || isNaN(endDateTime.getTime())) {
      throw new Error('終了日時は有効な日付である必要があります');
    }
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      throw new Error('終了日時は開始日時より後である必要があります');
    }
    return new CalendarEventDetail(title.trim(), startDateTime, endDateTime, description);
  }

  /**
   * 予約情報から CalendarEventDetail を構築するファクトリメソッド。
   * BR-2.4: カレンダー予定には予約日時および顧客名が記載される。
   */
  static fromReservation(
    customerName: string,
    dateTime: string,
    durationMinutes: number,
  ): CalendarEventDetail {
    const start = new Date(dateTime);
    if (isNaN(start.getTime())) {
      throw new Error('dateTime は有効な ISO 8601 形式である必要があります');
    }
    if (durationMinutes <= 0) {
      throw new Error('durationMinutes は正の数である必要があります');
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const title = `予約: ${customerName}`;
    const description = `顧客名: ${customerName}`;

    return CalendarEventDetail.create(title, start, end, description);
  }

  equals(other: CalendarEventDetail): boolean {
    return (
      this.title === other.title &&
      this.startDateTime.getTime() === other.startDateTime.getTime() &&
      this.endDateTime.getTime() === other.endDateTime.getTime() &&
      this.description === other.description
    );
  }
}
