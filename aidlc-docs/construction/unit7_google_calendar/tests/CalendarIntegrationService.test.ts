import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CalendarIntegrationService } from '../src/CalendarIntegrationService';
import { GoogleOAuthService } from '../src/GoogleOAuthService';
import { GoogleCalendarIntegration } from '../src/GoogleCalendarIntegration';
import { OAuthToken } from '../src/OAuthToken';
import { CalendarId } from '../src/CalendarId';
import { InMemoryGoogleCalendarIntegrationRepository } from '../src/InMemoryGoogleCalendarIntegrationRepository';
import { GoogleCalendarApiClient, CalendarListEntry } from '../src/GoogleCalendarApiClient';

describe('CalendarIntegrationService', () => {
  let integrationRepository: InMemoryGoogleCalendarIntegrationRepository;
  let mockOAuthService: GoogleOAuthService;
  let mockCalendarApiClient: GoogleCalendarApiClient;
  let service: CalendarIntegrationService;

  const validToken = OAuthToken.create(
    'access-token-123',
    'refresh-token-456',
    new Date('2027-12-31T23:59:59Z'),
  );

  const calendarList: CalendarListEntry[] = [
    { id: 'primary@gmail.com', summary: 'Primary Calendar', primary: true },
    { id: 'work@gmail.com', summary: 'Work Calendar', primary: false },
  ];

  beforeEach(() => {
    integrationRepository = new InMemoryGoogleCalendarIntegrationRepository();

    mockOAuthService = {
      buildAuthorizationUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?state=test'),
      exchangeAuthorizationCode: vi.fn().mockResolvedValue(validToken),
      refreshToken: vi.fn().mockResolvedValue(validToken),
    } as unknown as GoogleOAuthService;

    mockCalendarApiClient = {
      listCalendars: vi.fn().mockResolvedValue(calendarList),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
    };

    service = new CalendarIntegrationService(
      integrationRepository,
      mockOAuthService,
      mockCalendarApiClient,
    );
  });

  // --- 正常系 ---

  it('7-1. OAuth認証完了後、GoogleCalendarIntegration が生成され連携が開始される（BR-1.1）', async () => {
    // OAuth フロー開始
    const result = await service.startOAuthFlow('owner-001');
    expect(result.authorizationUrl).toContain('https://accounts.google.com');
    expect(result.integrationId).toBeDefined();

    // 認可コード受信後、トークン取得
    await service.completeOAuthFlow(result.integrationId, 'valid-auth-code');

    const integration = await integrationRepository.findByOwnerId('owner-001');
    expect(integration).not.toBeNull();
    expect(integration!.oauthToken).not.toBeNull();
  });

  it('7-2. カレンダー一覧から対象カレンダーを選択し、CalendarId が設定される（BR-1.2）', async () => {
    // セットアップ: OAuth フロー完了
    const result = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result.integrationId, 'valid-auth-code');

    // カレンダー一覧取得
    const calendars = await service.listCalendars('owner-001');
    expect(calendars).toHaveLength(2);

    // カレンダー選択
    await service.selectCalendar('owner-001', 'primary@gmail.com');

    const integration = await integrationRepository.findByOwnerId('owner-001');
    expect(integration!.calendarId!.value).toBe('primary@gmail.com');
    expect(integration!.isActive()).toBe(true);
  });

  it('7-3. 連携解除を実行すると、GoogleCalendarIntegration が無効化され OAuthToken が削除される（BR-1.3）', async () => {
    // セットアップ: 連携を有効化
    const result = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result.integrationId, 'valid-auth-code');
    await service.selectCalendar('owner-001', 'primary@gmail.com');

    // 連携解除
    await service.deactivateIntegration('owner-001');

    const integration = await integrationRepository.findByOwnerId('owner-001');
    expect(integration!.status).toBe('inactive');
    expect(integration!.oauthToken).toBeNull();
    expect(integration!.calendarId).toBeNull();
  });

  it('7-4. 連携解除後に再度連携を開始できる', async () => {
    // 連携 -> 解除
    const result1 = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result1.integrationId, 'valid-auth-code');
    await service.selectCalendar('owner-001', 'primary@gmail.com');
    await service.deactivateIntegration('owner-001');

    // 再度連携開始（既存のエンティティが再利用される）
    const result2 = await service.startOAuthFlow('owner-001');
    expect(result2.integrationId).toBe(result1.integrationId);

    await service.completeOAuthFlow(result2.integrationId, 'new-auth-code');
    await service.selectCalendar('owner-001', 'work@gmail.com');

    const integration = await integrationRepository.findByOwnerId('owner-001');
    expect(integration!.isActive()).toBe(true);
    expect(integration!.calendarId!.value).toBe('work@gmail.com');
  });

  // --- 異常系 ---

  it('7-5. 存在しない ownerId で連携開始を試みた場合、新規エンティティが作成される', async () => {
    // startOAuthFlow は存在しない ownerId でも新規作成する仕様
    const result = await service.startOAuthFlow('non-existent-owner');
    expect(result.integrationId).toBeDefined();
    expect(result.authorizationUrl).toBeDefined();
  });

  it('7-6. 既に連携済みのオーナーが再度連携開始を試みた場合、既存エンティティが再利用される', async () => {
    const result1 = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result1.integrationId, 'valid-auth-code');
    await service.selectCalendar('owner-001', 'primary@gmail.com');

    // 既に連携済みのオーナーが再度 startOAuthFlow
    const result2 = await service.startOAuthFlow('owner-001');
    expect(result2.integrationId).toBe(result1.integrationId);
  });

  it('7-7. Google OAuth 認証に失敗した場合のエラーハンドリング', async () => {
    vi.mocked(mockOAuthService.exchangeAuthorizationCode).mockRejectedValue(
      new Error('OAuth authentication failed'),
    );

    const result = await service.startOAuthFlow('owner-001');
    await expect(
      service.completeOAuthFlow(result.integrationId, 'invalid-code'),
    ).rejects.toThrow('OAuth authentication failed');
  });

  it('7-8. カレンダー一覧取得に失敗した場合のエラーハンドリング', async () => {
    // セットアップ: OAuth フロー完了
    const result = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result.integrationId, 'valid-auth-code');

    vi.mocked(mockCalendarApiClient.listCalendars).mockRejectedValue(
      new Error('Failed to fetch calendar list'),
    );

    await expect(service.listCalendars('owner-001')).rejects.toThrow(
      'Failed to fetch calendar list',
    );
  });

  // --- 境界値 ---

  it('7-9. カレンダー一覧が空（0件）の場合、空配列が返る', async () => {
    // セットアップ: OAuth フロー完了
    const result = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result.integrationId, 'valid-auth-code');

    vi.mocked(mockCalendarApiClient.listCalendars).mockResolvedValue([]);

    const calendars = await service.listCalendars('owner-001');
    expect(calendars).toHaveLength(0);
  });

  it('7-10. オーナーが保有するカレンダーが1件のみの場合', async () => {
    // セットアップ: OAuth フロー完了
    const result = await service.startOAuthFlow('owner-001');
    await service.completeOAuthFlow(result.integrationId, 'valid-auth-code');

    const singleCalendar: CalendarListEntry[] = [
      { id: 'only@gmail.com', summary: 'Only Calendar', primary: true },
    ];
    vi.mocked(mockCalendarApiClient.listCalendars).mockResolvedValue(singleCalendar);

    const calendars = await service.listCalendars('owner-001');
    expect(calendars).toHaveLength(1);
    expect(calendars[0].id).toBe('only@gmail.com');
  });
});
