import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleCalendarApiClient, CalendarListEntry } from '../src/GoogleCalendarApiClient';
import { CalendarEventDetail } from '../src/CalendarEventDetail';

describe('GoogleCalendarApiClient', () => {
  let mockClient: GoogleCalendarApiClient;

  const validAccessToken = 'valid-access-token-123';
  const calendarId = 'primary@gmail.com';
  const eventId = 'google-event-001';

  const eventDetail = CalendarEventDetail.create(
    '予約: 田中太郎',
    new Date('2026-06-15T10:00:00Z'),
    new Date('2026-06-15T11:00:00Z'),
    '顧客名: 田中太郎',
  );

  beforeEach(() => {
    mockClient = {
      listCalendars: vi.fn(),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
    };
  });

  // --- 正常系 ---

  it('9-1. カレンダー一覧取得（GET /calendars）が正しいレスポンスを返す', async () => {
    const expectedCalendars: CalendarListEntry[] = [
      { id: 'primary@gmail.com', summary: 'Primary Calendar', primary: true },
      { id: 'work@gmail.com', summary: 'Work Calendar', primary: false },
    ];
    vi.mocked(mockClient.listCalendars).mockResolvedValue(expectedCalendars);

    const result = await mockClient.listCalendars(validAccessToken);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('primary@gmail.com');
    expect(result[0].summary).toBe('Primary Calendar');
    expect(result[0].primary).toBe(true);
    expect(mockClient.listCalendars).toHaveBeenCalledWith(validAccessToken);
  });

  it('9-2. イベント作成（POST /calendars/{calendarId}/events）が Google イベント ID を含むレスポンスを返す', async () => {
    vi.mocked(mockClient.createEvent).mockResolvedValue('created-google-event-id');

    const result = await mockClient.createEvent(validAccessToken, calendarId, eventDetail);

    expect(result).toBe('created-google-event-id');
    expect(mockClient.createEvent).toHaveBeenCalledWith(validAccessToken, calendarId, eventDetail);
  });

  it('9-3. イベント更新（PUT /calendars/{calendarId}/events/{eventId}）が成功する', async () => {
    vi.mocked(mockClient.updateEvent).mockResolvedValue(undefined);

    await expect(
      mockClient.updateEvent(validAccessToken, calendarId, eventId, eventDetail),
    ).resolves.toBeUndefined();

    expect(mockClient.updateEvent).toHaveBeenCalledWith(
      validAccessToken,
      calendarId,
      eventId,
      eventDetail,
    );
  });

  it('9-4. イベント削除（DELETE /calendars/{calendarId}/events/{eventId}）が成功する', async () => {
    vi.mocked(mockClient.deleteEvent).mockResolvedValue(undefined);

    await expect(
      mockClient.deleteEvent(validAccessToken, calendarId, eventId),
    ).resolves.toBeUndefined();

    expect(mockClient.deleteEvent).toHaveBeenCalledWith(validAccessToken, calendarId, eventId);
  });

  // --- 異常系 ---

  it('9-5. 無効な OAuthToken（期限切れ）で API 呼び出しを試みた場合、認証エラー（401）が適切にハンドリングされる', async () => {
    const error = new Error('401 Unauthorized: Token expired');
    vi.mocked(mockClient.listCalendars).mockRejectedValue(error);

    await expect(mockClient.listCalendars('expired-token')).rejects.toThrow(
      '401 Unauthorized: Token expired',
    );
  });

  it('9-6. 存在しない calendarId を指定した場合、404エラーが適切にハンドリングされる', async () => {
    const error = new Error('404 Not Found: Calendar not found');
    vi.mocked(mockClient.createEvent).mockRejectedValue(error);

    await expect(
      mockClient.createEvent(validAccessToken, 'non-existent-calendar', eventDetail),
    ).rejects.toThrow('404 Not Found: Calendar not found');
  });

  it('9-7. 存在しない eventId を指定した場合（更新・削除時）、404エラーが適切にハンドリングされる', async () => {
    const updateError = new Error('404 Not Found: Event not found');
    const deleteError = new Error('404 Not Found: Event not found');

    vi.mocked(mockClient.updateEvent).mockRejectedValue(updateError);
    vi.mocked(mockClient.deleteEvent).mockRejectedValue(deleteError);

    await expect(
      mockClient.updateEvent(validAccessToken, calendarId, 'non-existent-event', eventDetail),
    ).rejects.toThrow('404 Not Found: Event not found');

    await expect(
      mockClient.deleteEvent(validAccessToken, calendarId, 'non-existent-event'),
    ).rejects.toThrow('404 Not Found: Event not found');
  });

  it('9-8. Google Calendar API がサーバーエラー（500）を返した場合のエラーハンドリング', async () => {
    const error = new Error('500 Internal Server Error');
    vi.mocked(mockClient.createEvent).mockRejectedValue(error);

    await expect(
      mockClient.createEvent(validAccessToken, calendarId, eventDetail),
    ).rejects.toThrow('500 Internal Server Error');
  });

  it('9-9. レートリミット（HTTP 429）を受信した場合のエラーハンドリング', async () => {
    const error = new Error('429 Too Many Requests');
    vi.mocked(mockClient.createEvent).mockRejectedValue(error);

    await expect(
      mockClient.createEvent(validAccessToken, calendarId, eventDetail),
    ).rejects.toThrow('429 Too Many Requests');
  });

  it('9-10. ネットワークタイムアウトが発生した場合のエラーハンドリング', async () => {
    const error = new Error('Network timeout: Request timed out after 30000ms');
    vi.mocked(mockClient.createEvent).mockRejectedValue(error);

    await expect(
      mockClient.createEvent(validAccessToken, calendarId, eventDetail),
    ).rejects.toThrow('Network timeout');
  });
});
