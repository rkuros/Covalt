import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarSyncService } from '../src/CalendarSyncService';
import { GoogleCalendarIntegration } from '../src/GoogleCalendarIntegration';
import { CalendarEventMapping } from '../src/CalendarEventMapping';
import { OAuthToken } from '../src/OAuthToken';
import { CalendarId } from '../src/CalendarId';
import { GoogleOAuthService } from '../src/GoogleOAuthService';
import { InMemoryGoogleCalendarIntegrationRepository } from '../src/InMemoryGoogleCalendarIntegrationRepository';
import { InMemoryCalendarEventMappingRepository } from '../src/InMemoryCalendarEventMappingRepository';
import { GoogleCalendarApiClient } from '../src/GoogleCalendarApiClient';
import {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from '../src/ReservationEvent';

describe('CalendarSyncService', () => {
  let integrationRepository: InMemoryGoogleCalendarIntegrationRepository;
  let mappingRepository: InMemoryCalendarEventMappingRepository;
  let mockCalendarApiClient: GoogleCalendarApiClient;
  let mockOAuthService: GoogleOAuthService;
  let service: CalendarSyncService;

  const validToken = OAuthToken.create(
    'access-token-123',
    'refresh-token-456',
    new Date('2027-12-31T23:59:59Z'),
  );

  const calendarIdValue = 'primary@gmail.com';

  const createdEvent: ReservationCreatedEvent = {
    eventType: 'reservation.created',
    reservationId: 'reservation-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    slotId: 'slot-001',
    dateTime: '2026-06-15T10:00:00Z',
    durationMinutes: 60,
    timestamp: '2026-06-14T12:00:00Z',
  };

  const modifiedEvent: ReservationModifiedEvent = {
    eventType: 'reservation.modified',
    reservationId: 'reservation-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    slotId: 'slot-001',
    dateTime: '2026-06-15T14:00:00Z',
    previousDateTime: '2026-06-15T10:00:00Z',
    durationMinutes: 90,
    timestamp: '2026-06-14T13:00:00Z',
  };

  const cancelledEvent: ReservationCancelledEvent = {
    eventType: 'reservation.cancelled',
    reservationId: 'reservation-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    slotId: 'slot-001',
    dateTime: '2026-06-15T10:00:00Z',
    timestamp: '2026-06-14T14:00:00Z',
  };

  async function setupActiveIntegration(ownerId: string = 'owner-001'): Promise<GoogleCalendarIntegration> {
    const integration = GoogleCalendarIntegration.create(ownerId);
    integration.setOAuthToken(validToken);
    integration.selectCalendar(CalendarId.create(calendarIdValue));
    await integrationRepository.save(integration);
    return integration;
  }

  async function setupMapping(
    reservationId: string = 'reservation-001',
    ownerId: string = 'owner-001',
    googleEventId: string = 'google-event-001',
  ): Promise<CalendarEventMapping> {
    const mapping = CalendarEventMapping.create(reservationId, ownerId, googleEventId, calendarIdValue);
    await mappingRepository.save(mapping);
    return mapping;
  }

  beforeEach(() => {
    integrationRepository = new InMemoryGoogleCalendarIntegrationRepository();
    mappingRepository = new InMemoryCalendarEventMappingRepository();

    mockCalendarApiClient = {
      listCalendars: vi.fn(),
      createEvent: vi.fn().mockResolvedValue('google-event-001'),
      updateEvent: vi.fn().mockResolvedValue(undefined),
      deleteEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockOAuthService = {
      buildAuthorizationUrl: vi.fn(),
      exchangeAuthorizationCode: vi.fn(),
      refreshToken: vi.fn(),
    } as unknown as GoogleOAuthService;

    service = new CalendarSyncService(
      integrationRepository,
      mappingRepository,
      mockCalendarApiClient,
      mockOAuthService,
    );
  });

  // --- 正常系 -- 予約作成（reservation.created / BR-2.1） ---

  it('8-1. reservation.created イベント受信時、連携が有効なオーナーのカレンダーにイベントが作成される', async () => {
    await setupActiveIntegration();

    await service.handleReservationCreated(createdEvent);

    expect(mockCalendarApiClient.createEvent).toHaveBeenCalledTimes(1);
    expect(mockCalendarApiClient.createEvent).toHaveBeenCalledWith(
      'access-token-123',
      calendarIdValue,
      expect.objectContaining({
        title: expect.stringContaining('田中太郎'),
      }),
    );
  });

  it('8-2. 作成されたカレンダーイベントに顧客名と予約日時が含まれる（BR-2.4）', async () => {
    await setupActiveIntegration();

    await service.handleReservationCreated(createdEvent);

    const callArgs = vi.mocked(mockCalendarApiClient.createEvent).mock.calls[0];
    const eventDetail = callArgs[2];
    expect(eventDetail.title).toContain('田中太郎');
    expect(eventDetail.startDateTime.getTime()).toBe(new Date('2026-06-15T10:00:00Z').getTime());
    expect(eventDetail.endDateTime.getTime()).toBe(new Date('2026-06-15T11:00:00Z').getTime());
  });

  it('8-3. 作成後、reservationId と Google イベント ID のマッピングが CalendarEventMapping に保存される', async () => {
    await setupActiveIntegration();

    await service.handleReservationCreated(createdEvent);

    const mapping = await mappingRepository.findByReservationId('reservation-001');
    expect(mapping).not.toBeNull();
    expect(mapping!.reservationId).toBe('reservation-001');
    expect(mapping!.googleEventId).toBe('google-event-001');
  });

  // --- 正常系 -- 予約変更（reservation.modified / BR-2.2） ---

  it('8-4. reservation.modified イベント受信時、CalendarEventMapping から対応する Google イベント ID が取得される', async () => {
    await setupActiveIntegration();
    await setupMapping();

    await service.handleReservationModified(modifiedEvent);

    expect(mockCalendarApiClient.updateEvent).toHaveBeenCalledWith(
      'access-token-123',
      calendarIdValue,
      'google-event-001',
      expect.any(Object),
    );
  });

  it('8-5. 変更後の dateTime・durationMinutes・customerName でカレンダーイベントが更新される', async () => {
    await setupActiveIntegration();
    await setupMapping();

    await service.handleReservationModified(modifiedEvent);

    const callArgs = vi.mocked(mockCalendarApiClient.updateEvent).mock.calls[0];
    const eventDetail = callArgs[3];
    expect(eventDetail.title).toContain('田中太郎');
    expect(eventDetail.startDateTime.getTime()).toBe(new Date('2026-06-15T14:00:00Z').getTime());
    // 90分後
    expect(eventDetail.endDateTime.getTime()).toBe(new Date('2026-06-15T15:30:00Z').getTime());
  });

  it('8-6. CalendarEventMapping のマッピングは維持される（イベントIDは変わらない）', async () => {
    await setupActiveIntegration();
    const originalMapping = await setupMapping();

    await service.handleReservationModified(modifiedEvent);

    const mapping = await mappingRepository.findByReservationId('reservation-001');
    expect(mapping).not.toBeNull();
    expect(mapping!.googleEventId).toBe(originalMapping.googleEventId);
    expect(mapping!.isActive()).toBe(true);
  });

  // --- 正常系 -- 予約キャンセル（reservation.cancelled / BR-2.3） ---

  it('8-7. reservation.cancelled イベント受信時、CalendarEventMapping から対応する Google イベント ID が取得される', async () => {
    await setupActiveIntegration();
    await setupMapping();

    await service.handleReservationCancelled(cancelledEvent);

    expect(mockCalendarApiClient.deleteEvent).toHaveBeenCalledWith(
      'access-token-123',
      calendarIdValue,
      'google-event-001',
    );
  });

  it('8-8. 対応するカレンダーイベントが削除される', async () => {
    await setupActiveIntegration();
    await setupMapping();

    await service.handleReservationCancelled(cancelledEvent);

    expect(mockCalendarApiClient.deleteEvent).toHaveBeenCalledTimes(1);
  });

  it('8-9. CalendarEventMapping のレコードが無効化される（論理削除）', async () => {
    await setupActiveIntegration();
    await setupMapping();

    await service.handleReservationCancelled(cancelledEvent);

    // findByReservationId は active なものだけ返すので null
    const activeMapping = await mappingRepository.findByReservationId('reservation-001');
    expect(activeMapping).toBeNull();
  });

  // --- 連携無効時のスキップ（BR-2.5） ---

  it('8-10. 連携が無効（未設定）のオーナーに対する reservation.created イベントは処理がスキップされる', async () => {
    // 連携設定なし
    await service.handleReservationCreated(createdEvent);

    expect(mockCalendarApiClient.createEvent).not.toHaveBeenCalled();
  });

  it('8-11. 連携が無効（解除済み）のオーナーに対する reservation.modified イベントは処理がスキップされる', async () => {
    const integration = await setupActiveIntegration();
    integration.deactivate();
    await integrationRepository.save(integration);

    await service.handleReservationModified(modifiedEvent);

    expect(mockCalendarApiClient.updateEvent).not.toHaveBeenCalled();
  });

  it('8-12. 連携が無効のオーナーに対する reservation.cancelled イベントは処理がスキップされる', async () => {
    // 連携設定なし
    await service.handleReservationCancelled(cancelledEvent);

    expect(mockCalendarApiClient.deleteEvent).not.toHaveBeenCalled();
  });

  it('8-13. 「要再認証」状態のオーナーに対するイベントは処理がスキップされる', async () => {
    const integration = await setupActiveIntegration();
    integration.markRequiresReauth();
    await integrationRepository.save(integration);

    await service.handleReservationCreated(createdEvent);

    expect(mockCalendarApiClient.createEvent).not.toHaveBeenCalled();
  });

  it('8-14. スキップ時にエラーが発生せず、正常に処理が完了する', async () => {
    // 連携設定なし -- エラーなく完了することを確認
    await expect(service.handleReservationCreated(createdEvent)).resolves.toBeUndefined();
    await expect(service.handleReservationModified(modifiedEvent)).resolves.toBeUndefined();
    await expect(service.handleReservationCancelled(cancelledEvent)).resolves.toBeUndefined();
  });

  // --- 冪等性（5.2 可用性・耐障害性） ---

  it('8-15. 同一 reservationId の reservation.created が重複受信された場合、二重作成が防止される', async () => {
    await setupActiveIntegration();

    // 1回目: イベント作成
    await service.handleReservationCreated(createdEvent);
    expect(mockCalendarApiClient.createEvent).toHaveBeenCalledTimes(1);

    // 2回目: 既にマッピングが存在するためスキップ
    await service.handleReservationCreated(createdEvent);
    expect(mockCalendarApiClient.createEvent).toHaveBeenCalledTimes(1); // 変わらず1回
  });

  it('8-16. 同一 reservationId の reservation.modified が重複受信された場合、冪等に更新される', async () => {
    await setupActiveIntegration();
    await setupMapping();

    // 1回目
    await service.handleReservationModified(modifiedEvent);
    // 2回目（冪等：同じ内容で更新されるだけ）
    await service.handleReservationModified(modifiedEvent);

    expect(mockCalendarApiClient.updateEvent).toHaveBeenCalledTimes(2);
  });

  it('8-17. 同一 reservationId の reservation.cancelled が重複受信された場合、エラーにならない', async () => {
    await setupActiveIntegration();
    await setupMapping();

    // 1回目: 正常にキャンセル
    await service.handleReservationCancelled(cancelledEvent);

    // 2回目: マッピングが無効化済みのため findByReservationId が null を返しスキップ
    await expect(
      service.handleReservationCancelled(cancelledEvent),
    ).resolves.toBeUndefined();

    expect(mockCalendarApiClient.deleteEvent).toHaveBeenCalledTimes(1);
  });

  // --- 異常系 ---

  it('8-18. Google Calendar API 呼び出し（イベント作成）が失敗した場合のエラーハンドリング', async () => {
    await setupActiveIntegration();
    vi.mocked(mockCalendarApiClient.createEvent).mockRejectedValue(
      new Error('API Error: Failed to create event'),
    );

    await expect(service.handleReservationCreated(createdEvent)).rejects.toThrow(
      'API Error: Failed to create event',
    );
  });

  it('8-19. Google Calendar API 呼び出し（イベント更新）が失敗した場合のエラーハンドリング', async () => {
    await setupActiveIntegration();
    await setupMapping();
    vi.mocked(mockCalendarApiClient.updateEvent).mockRejectedValue(
      new Error('API Error: Failed to update event'),
    );

    await expect(service.handleReservationModified(modifiedEvent)).rejects.toThrow(
      'API Error: Failed to update event',
    );
  });

  it('8-20. Google Calendar API 呼び出し（イベント削除）が失敗した場合のエラーハンドリング', async () => {
    await setupActiveIntegration();
    await setupMapping();
    vi.mocked(mockCalendarApiClient.deleteEvent).mockRejectedValue(
      new Error('API Error: Failed to delete event'),
    );

    await expect(service.handleReservationCancelled(cancelledEvent)).rejects.toThrow(
      'API Error: Failed to delete event',
    );
  });

  it('8-21. マッピングが存在しない状態で reservation.modified を受信した場合、処理がスキップされる', async () => {
    await setupActiveIntegration();
    // マッピングを作成しない

    await service.handleReservationModified(modifiedEvent);

    expect(mockCalendarApiClient.updateEvent).not.toHaveBeenCalled();
  });

  it('8-22. マッピングが存在しない状態で reservation.cancelled を受信した場合、処理がスキップされる', async () => {
    await setupActiveIntegration();
    // マッピングを作成しない

    await service.handleReservationCancelled(cancelledEvent);

    expect(mockCalendarApiClient.deleteEvent).not.toHaveBeenCalled();
  });

  it('8-23. トークン期限切れ時に自動リフレッシュが試行され、成功した場合は同期処理が続行される', async () => {
    // 期限切れトークンを設定
    const expiredToken = OAuthToken.create(
      'expired-access-token',
      'refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(expiredToken);
    integration.selectCalendar(CalendarId.create(calendarIdValue));
    await integrationRepository.save(integration);

    // リフレッシュ成功
    const refreshedToken = OAuthToken.create(
      'refreshed-access-token',
      'new-refresh-token',
      new Date('2027-12-31T23:59:59Z'),
    );
    vi.mocked(mockOAuthService.refreshToken).mockResolvedValue(refreshedToken);

    await service.handleReservationCreated(createdEvent);

    expect(mockOAuthService.refreshToken).toHaveBeenCalledTimes(1);
    expect(mockCalendarApiClient.createEvent).toHaveBeenCalledWith(
      'refreshed-access-token',
      calendarIdValue,
      expect.any(Object),
    );
  });

  it('8-24. トークンリフレッシュにも失敗した場合、連携状態を「要再認証」に遷移', async () => {
    // 期限切れトークンを設定
    const expiredToken = OAuthToken.create(
      'expired-access-token',
      'refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(expiredToken);
    integration.selectCalendar(CalendarId.create(calendarIdValue));
    await integrationRepository.save(integration);

    // リフレッシュ失敗
    vi.mocked(mockOAuthService.refreshToken).mockRejectedValue(
      new Error('Token revoked'),
    );

    await expect(service.handleReservationCreated(createdEvent)).rejects.toThrow(
      'トークンリフレッシュ失敗',
    );

    const updatedIntegration = await integrationRepository.findByOwnerId('owner-001');
    expect(updatedIntegration!.status).toBe('requires_reauth');
  });

  // --- リトライ（5.2 可用性・耐障害性）--- モック化（インフラ層の責務） ---

  it('8-25. Google Calendar API の一時的な障害（5xx エラー）時のエラーがドメイン層に伝播する', async () => {
    await setupActiveIntegration();
    vi.mocked(mockCalendarApiClient.createEvent).mockRejectedValue(
      new Error('500 Internal Server Error'),
    );

    // リトライはインフラ層（API クライアント）の責務。ドメイン層ではエラーが伝播することを確認
    await expect(service.handleReservationCreated(createdEvent)).rejects.toThrow(
      '500 Internal Server Error',
    );
  });

  it('8-26. レートリミット（HTTP 429）受信時のエラーがドメイン層に伝播する', async () => {
    await setupActiveIntegration();
    vi.mocked(mockCalendarApiClient.createEvent).mockRejectedValue(
      new Error('429 Too Many Requests'),
    );

    await expect(service.handleReservationCreated(createdEvent)).rejects.toThrow(
      '429 Too Many Requests',
    );
  });

  it('8-27. リトライ上限超過時のエラーがドメイン層に伝播する', async () => {
    await setupActiveIntegration();
    vi.mocked(mockCalendarApiClient.createEvent).mockRejectedValue(
      new Error('Retry limit exceeded'),
    );

    await expect(service.handleReservationCreated(createdEvent)).rejects.toThrow(
      'Retry limit exceeded',
    );
  });

  it('8-28. リトライ上限超過時のエラーから呼び出し元が通知処理を実行できる', async () => {
    await setupActiveIntegration();
    vi.mocked(mockCalendarApiClient.createEvent).mockRejectedValue(
      new Error('Retry limit exceeded'),
    );

    try {
      await service.handleReservationCreated(createdEvent);
      expect.unreachable('エラーが発生するべき');
    } catch (error) {
      // 呼び出し元（ReservationEventHandler等）がこのエラーをキャッチして通知処理を行う
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Retry limit exceeded');
    }
  });
});
