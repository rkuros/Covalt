import { describe, it, expect } from 'vitest';
import { GoogleCalendarIntegration } from '../src/GoogleCalendarIntegration';
import { OAuthToken } from '../src/OAuthToken';
import { CalendarId } from '../src/CalendarId';

describe('GoogleCalendarIntegration', () => {
  const validToken = OAuthToken.create(
    'access-token-123',
    'refresh-token-456',
    new Date('2027-12-31T23:59:59Z'),
  );
  const validCalendarId = CalendarId.create('primary@gmail.com');

  // --- 正常系 ---

  it('4-1. ownerId を指定してインスタンスを生成できる（初期状態は無効）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    expect(integration).toBeInstanceOf(GoogleCalendarIntegration);
    expect(integration.ownerId).toBe('owner-001');
    expect(integration.status).toBe('inactive');
    expect(integration.oauthToken).toBeNull();
    expect(integration.calendarId).toBeNull();
  });

  it('4-2. OAuthToken と CalendarId を設定して連携を有効化できる（BR-1.1, BR-1.2）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    expect(integration.status).toBe('active');
    expect(integration.oauthToken).toBe(validToken);
    expect(integration.calendarId).toBe(validCalendarId);
  });

  it('4-3. 連携が有効な場合、isActive が true を返す', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    expect(integration.isActive()).toBe(true);
  });

  it('4-4. 連携解除を実行すると、連携状態が無効になる（BR-1.3）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);
    expect(integration.isActive()).toBe(true);

    integration.deactivate();
    expect(integration.status).toBe('inactive');
    expect(integration.isActive()).toBe(false);
  });

  it('4-5. 連携解除時に OAuthToken が無効化・削除される（BR-1.3）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    integration.deactivate();
    expect(integration.oauthToken).toBeNull();
    expect(integration.calendarId).toBeNull();
  });

  it('4-6. カレンダーID を変更（カレンダー再選択）できる（BR-1.2）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    const newCalendarId = CalendarId.create('secondary@gmail.com');
    integration.selectCalendar(newCalendarId);

    expect(integration.calendarId!.value).toBe('secondary@gmail.com');
    expect(integration.isActive()).toBe(true);
  });

  it('4-7. OAuthToken を更新（リフレッシュ後の新トークン設定）できる', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    const newToken = OAuthToken.create(
      'new-access-token',
      'new-refresh-token',
      new Date('2028-01-01T00:00:00Z'),
    );
    integration.updateOAuthToken(newToken);

    expect(integration.oauthToken!.accessToken).toBe('new-access-token');
    expect(integration.oauthToken!.refreshToken).toBe('new-refresh-token');
  });

  // --- 異常系 ---

  it('4-8. ownerId が空文字の場合、生成時にエラーとなる', () => {
    expect(() => GoogleCalendarIntegration.create('')).toThrow('ownerId は必須です');
  });

  it('4-9. OAuthToken なしで連携を有効化しようとした場合、エラーとなる', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    // OAuthToken を設定せずに selectCalendar を呼ぶ
    expect(() => integration.selectCalendar(validCalendarId)).toThrow(
      'OAuth 認証が完了していないためカレンダーを選択できません',
    );
  });

  it('4-10. CalendarId なしで連携を有効化しようとした場合、isActive は false のまま', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    // CalendarId を設定しない状態では isActive は false
    expect(integration.isActive()).toBe(false);
    expect(integration.status).toBe('inactive');
  });

  it('4-11. 既に連携解除済みの状態で再度解除を実行した場合、エラーにならない', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    integration.deactivate();
    expect(integration.status).toBe('inactive');

    // 再度 deactivate してもエラーにならない
    expect(() => integration.deactivate()).not.toThrow();
    expect(integration.status).toBe('inactive');
  });

  // --- 境界値・状態遷移 ---

  it('4-12. 無効 -> 有効 -> 無効 -> 有効 の連携状態遷移が正しく行われる', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    expect(integration.status).toBe('inactive');

    // 無効 -> 有効
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);
    expect(integration.status).toBe('active');
    expect(integration.isActive()).toBe(true);

    // 有効 -> 無効
    integration.deactivate();
    expect(integration.status).toBe('inactive');
    expect(integration.isActive()).toBe(false);

    // 無効 -> 有効（再連携）
    const newToken = OAuthToken.create(
      'new-access-token',
      'new-refresh-token',
      new Date('2028-01-01T00:00:00Z'),
    );
    integration.setOAuthToken(newToken);
    const newCalendarId = CalendarId.create('new-calendar@gmail.com');
    integration.selectCalendar(newCalendarId);
    expect(integration.status).toBe('active');
    expect(integration.isActive()).toBe(true);
  });

  it('4-13. 「要再認証」状態への遷移（リフレッシュトークン無効化時、5.3 準拠）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);
    expect(integration.status).toBe('active');

    integration.markRequiresReauth();
    expect(integration.status).toBe('requires_reauth');
  });

  it('4-14. 「要再認証」状態では連携が無効として扱われる（isActive が false）', () => {
    const integration = GoogleCalendarIntegration.create('owner-001');
    integration.setOAuthToken(validToken);
    integration.selectCalendar(validCalendarId);

    integration.markRequiresReauth();
    expect(integration.isActive()).toBe(false);
  });

  // --- アクセス制御 ---

  it('4-15. ownerId によるアクセス制御 -- 異なる ownerId のインスタンスは別々に管理される', () => {
    const integration1 = GoogleCalendarIntegration.create('owner-001');
    const integration2 = GoogleCalendarIntegration.create('owner-002');

    integration1.setOAuthToken(validToken);
    integration1.selectCalendar(validCalendarId);

    // owner-001 は有効、owner-002 は無効のまま
    expect(integration1.isActive()).toBe(true);
    expect(integration2.isActive()).toBe(false);
    expect(integration1.ownerId).not.toBe(integration2.ownerId);
  });
});
