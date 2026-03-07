import { CalendarEventDetail } from './CalendarEventDetail';

/**
 * カレンダー情報（一覧取得用）。
 */
export interface CalendarListEntry {
  readonly id: string;
  readonly summary: string;
  readonly primary: boolean;
}

/**
 * Gateway インターフェース: GoogleCalendarApiClient
 *
 * Google Calendar API との通信を担うインフラストラクチャサービス。
 * 実装は Integration フェーズで提供する。
 */
export interface GoogleCalendarApiClient {
  /**
   * オーナーが利用可能なカレンダー一覧を取得する。
   * GET /calendars (CalendarList.list)
   */
  listCalendars(accessToken: string): Promise<CalendarListEntry[]>;

  /**
   * カレンダーにイベントを作成し、生成された Google イベント ID を返す。
   * POST /calendars/{calendarId}/events (Events.insert)
   */
  createEvent(
    accessToken: string,
    calendarId: string,
    eventDetail: CalendarEventDetail,
  ): Promise<string>;

  /**
   * 既存のカレンダーイベントを更新する。
   * PUT /calendars/{calendarId}/events/{eventId} (Events.update)
   */
  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    eventDetail: CalendarEventDetail,
  ): Promise<void>;

  /**
   * カレンダーイベントを削除する。
   * DELETE /calendars/{calendarId}/events/{eventId} (Events.delete)
   */
  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void>;
}
