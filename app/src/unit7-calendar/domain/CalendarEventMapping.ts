/**
 * エンティティ: CalendarEventMapping
 *
 * 予約 ID（reservationId）と Google カレンダーイベント ID の対応関係を管理する。
 * 更新・削除時に対象イベントを特定し、冪等性を保証するために使用する。
 */
export class CalendarEventMapping {
  readonly id: string;
  readonly reservationId: string;
  readonly ownerId: string;
  readonly googleEventId: string;
  readonly calendarId: string;
  private _active: boolean;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    id: string,
    reservationId: string,
    ownerId: string,
    googleEventId: string,
    calendarId: string,
    active: boolean,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.id = id;
    this.reservationId = reservationId;
    this.ownerId = ownerId;
    this.googleEventId = googleEventId;
    this.calendarId = calendarId;
    this._active = active;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get active(): boolean {
    return this._active;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * ファクトリメソッド: 新しいマッピングを生成する。
   */
  static create(
    reservationId: string,
    ownerId: string,
    googleEventId: string,
    calendarId: string,
  ): CalendarEventMapping {
    if (!reservationId) throw new Error('reservationId は必須です');
    if (!ownerId) throw new Error('ownerId は必須です');
    if (!googleEventId) throw new Error('googleEventId は必須です');
    if (!calendarId) throw new Error('calendarId は必須です');

    const now = new Date();
    return new CalendarEventMapping(
      crypto.randomUUID(),
      reservationId,
      ownerId,
      googleEventId,
      calendarId,
      true,
      now,
      now,
    );
  }

  /**
   * 永続化データから復元するファクトリメソッド。
   */
  static reconstruct(
    id: string,
    reservationId: string,
    ownerId: string,
    googleEventId: string,
    calendarId: string,
    active: boolean,
    createdAt: Date,
    updatedAt: Date,
  ): CalendarEventMapping {
    return new CalendarEventMapping(
      id,
      reservationId,
      ownerId,
      googleEventId,
      calendarId,
      active,
      createdAt,
      updatedAt,
    );
  }

  /**
   * マッピングを無効化する（予約キャンセル時）。
   */
  deactivate(): void {
    this._active = false;
    this._updatedAt = new Date();
  }

  /**
   * マッピングが有効かどうかを判定する。
   */
  isActive(): boolean {
    return this._active;
  }
}
