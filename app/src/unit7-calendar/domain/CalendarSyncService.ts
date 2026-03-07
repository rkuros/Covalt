import { CalendarEventDetail } from './CalendarEventDetail';
import { CalendarEventMapping } from './CalendarEventMapping';
import { CalendarEventMappingRepository } from './CalendarEventMappingRepository';
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration';
import { GoogleCalendarIntegrationRepository } from './GoogleCalendarIntegrationRepository';
import { GoogleCalendarApiClient } from './GoogleCalendarApiClient';
import { GoogleOAuthService } from './GoogleOAuthService';
import {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from './ReservationEvent';

/**
 * サービス: CalendarSyncService
 *
 * 予約イベント受信時のカレンダー同期処理を統括する。
 * イベント種別に応じて予定の追加・更新・削除を実行する。
 */
export class CalendarSyncService {
  constructor(
    private readonly integrationRepository: GoogleCalendarIntegrationRepository,
    private readonly mappingRepository: CalendarEventMappingRepository,
    private readonly calendarApiClient: GoogleCalendarApiClient,
    private readonly oauthService: GoogleOAuthService,
  ) {}

  /**
   * 予約作成イベントを処理する。
   * BR-2.1: 連携が有効なオーナーの対象カレンダーに予定が自動追加される。
   * 冪等性: 同一 reservationId に対するマッピングが既に存在する場合はスキップする。
   */
  async handleReservationCreated(event: ReservationCreatedEvent): Promise<void> {
    const integration = await this.getActiveIntegration(event.ownerId);
    if (!integration) {
      console.log(`連携が無効のためスキップ: ownerId=${event.ownerId}`);
      return;
    }

    // 冪等性チェック: 既にマッピングが存在する場合はスキップ
    const existingMapping = await this.mappingRepository.findByReservationId(event.reservationId);
    if (existingMapping) {
      console.log(`既にマッピングが存在するためスキップ: reservationId=${event.reservationId}`);
      return;
    }

    const accessToken = await this.getValidAccessToken(integration);
    const eventDetail = CalendarEventDetail.fromReservation(
      event.customerName,
      event.dateTime,
      event.durationMinutes,
    );

    const googleEventId = await this.calendarApiClient.createEvent(
      accessToken,
      integration.calendarId!.value,
      eventDetail,
    );

    const mapping = CalendarEventMapping.create(
      event.reservationId,
      event.ownerId,
      googleEventId,
      integration.calendarId!.value,
    );
    await this.mappingRepository.save(mapping);
  }

  /**
   * 予約変更イベントを処理する。
   * BR-2.2: 予約変更時、対応するカレンダー予定の日時が自動更新される。
   */
  async handleReservationModified(event: ReservationModifiedEvent): Promise<void> {
    const integration = await this.getActiveIntegration(event.ownerId);
    if (!integration) {
      console.log(`連携が無効のためスキップ: ownerId=${event.ownerId}`);
      return;
    }

    const mapping = await this.mappingRepository.findByReservationId(event.reservationId);
    if (!mapping) {
      console.log(`マッピングが見つからないためスキップ: reservationId=${event.reservationId}`);
      return;
    }

    const accessToken = await this.getValidAccessToken(integration);
    const eventDetail = CalendarEventDetail.fromReservation(
      event.customerName,
      event.dateTime,
      event.durationMinutes,
    );

    await this.calendarApiClient.updateEvent(
      accessToken,
      mapping.calendarId,
      mapping.googleEventId,
      eventDetail,
    );
  }

  /**
   * 予約キャンセルイベントを処理する。
   * BR-2.3: 予約キャンセル時、対応するカレンダー予定が自動削除される。
   */
  async handleReservationCancelled(event: ReservationCancelledEvent): Promise<void> {
    const integration = await this.getActiveIntegration(event.ownerId);
    if (!integration) {
      console.log(`連携が無効のためスキップ: ownerId=${event.ownerId}`);
      return;
    }

    const mapping = await this.mappingRepository.findByReservationId(event.reservationId);
    if (!mapping) {
      console.log(`マッピングが見つからないためスキップ: reservationId=${event.reservationId}`);
      return;
    }

    const accessToken = await this.getValidAccessToken(integration);

    await this.calendarApiClient.deleteEvent(
      accessToken,
      mapping.calendarId,
      mapping.googleEventId,
    );

    mapping.deactivate();
    await this.mappingRepository.save(mapping);
  }

  /**
   * オーナーのアクティブな連携設定を取得する。
   * BR-2.5: 連携が無効のオーナーに対するイベントは処理をスキップする。
   */
  private async getActiveIntegration(ownerId: string): Promise<GoogleCalendarIntegration | null> {
    const integration = await this.integrationRepository.findByOwnerId(ownerId);
    if (!integration || !integration.isActive()) {
      return null;
    }
    return integration;
  }

  /**
   * 有効なアクセストークンを取得する。
   * 期限切れの場合はリフレッシュを試み、失敗時は再認証状態に遷移させる。
   */
  private async getValidAccessToken(integration: GoogleCalendarIntegration): Promise<string> {
    const token = integration.oauthToken!;

    if (!token.needsRefresh()) {
      return token.accessToken;
    }

    try {
      const refreshedToken = await this.oauthService.refreshToken(token);
      integration.updateOAuthToken(refreshedToken);
      await this.integrationRepository.save(integration);
      return refreshedToken.accessToken;
    } catch {
      integration.markRequiresReauth();
      await this.integrationRepository.save(integration);
      throw new Error(`トークンリフレッシュ失敗。再認証が必要: ownerId=${integration.ownerId}`);
    }
  }
}
