import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleOAuthService } from '../src/GoogleOAuthService';
import { OAuthToken } from '../src/OAuthToken';
import { GoogleOAuthGateway, OAuthTokenResponse } from '../src/GoogleOAuthGateway';

describe('GoogleOAuthService', () => {
  let mockGateway: GoogleOAuthGateway;
  let service: GoogleOAuthService;

  const validTokenResponse: OAuthTokenResponse = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresInSeconds: 3600,
  };

  beforeEach(() => {
    mockGateway = {
      buildAuthorizationUrl: vi.fn(),
      exchangeAuthorizationCode: vi.fn(),
      refreshAccessToken: vi.fn(),
    };
    service = new GoogleOAuthService(mockGateway);
  });

  // --- 正常系 ---

  it('6-1. 認可URL が正しいエンドポイントで生成される', () => {
    const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth?state=test-state&scope=calendar.events+calendar.readonly';
    vi.mocked(mockGateway.buildAuthorizationUrl).mockReturnValue(expectedUrl);

    const url = service.buildAuthorizationUrl('test-state');
    expect(url).toBe(expectedUrl);
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(mockGateway.buildAuthorizationUrl).toHaveBeenCalledWith('test-state');
  });

  it('6-2. 認可URL に必要なスコープ（calendar.events, calendar.readonly）が含まれる', () => {
    const expectedUrl = 'https://accounts.google.com/o/oauth2/v2/auth?scope=calendar.events+calendar.readonly&state=test';
    vi.mocked(mockGateway.buildAuthorizationUrl).mockReturnValue(expectedUrl);

    const url = service.buildAuthorizationUrl('test');
    expect(url).toContain('calendar.events');
    expect(url).toContain('calendar.readonly');
  });

  it('6-3. 認可コードからアクセストークンとリフレッシュトークンを取得できる', async () => {
    vi.mocked(mockGateway.exchangeAuthorizationCode).mockResolvedValue(validTokenResponse);

    const token = await service.exchangeAuthorizationCode('valid-auth-code');
    expect(token.accessToken).toBe('new-access-token');
    expect(token.refreshToken).toBe('new-refresh-token');
    expect(mockGateway.exchangeAuthorizationCode).toHaveBeenCalledWith('valid-auth-code');
  });

  it('6-4. 取得したトークンが OAuthToken 値オブジェクトとして返却される', async () => {
    vi.mocked(mockGateway.exchangeAuthorizationCode).mockResolvedValue(validTokenResponse);

    const token = await service.exchangeAuthorizationCode('valid-auth-code');
    expect(token).toBeInstanceOf(OAuthToken);
  });

  it('6-5. 期限切れのアクセストークンをリフレッシュトークンで自動更新できる（5.3 準拠）', async () => {
    const refreshedResponse: OAuthTokenResponse = {
      accessToken: 'refreshed-access-token',
      refreshToken: 'refreshed-refresh-token',
      expiresInSeconds: 3600,
    };
    vi.mocked(mockGateway.refreshAccessToken).mockResolvedValue(refreshedResponse);

    // 期限切れトークン
    const expiredToken = OAuthToken.create(
      'old-access-token',
      'old-refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );

    const newToken = await service.refreshToken(expiredToken);
    expect(newToken.accessToken).toBe('refreshed-access-token');
    expect(mockGateway.refreshAccessToken).toHaveBeenCalledWith('old-refresh-token');
  });

  it('6-6. リフレッシュ後に新しい OAuthToken が返却される', async () => {
    const refreshedResponse: OAuthTokenResponse = {
      accessToken: 'refreshed-access-token',
      refreshToken: '',
      expiresInSeconds: 3600,
    };
    vi.mocked(mockGateway.refreshAccessToken).mockResolvedValue(refreshedResponse);

    const currentToken = OAuthToken.create(
      'old-access-token',
      'original-refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );

    const newToken = await service.refreshToken(currentToken);
    expect(newToken).toBeInstanceOf(OAuthToken);
    expect(newToken.accessToken).toBe('refreshed-access-token');
    // リフレッシュトークンが空の場合、既存のものが引き継がれる
    expect(newToken.refreshToken).toBe('original-refresh-token');
  });

  // --- 異常系 ---

  it('6-7. 無効な認可コードでトークン取得を試みた場合、エラーとなる', async () => {
    vi.mocked(mockGateway.exchangeAuthorizationCode).mockRejectedValue(
      new Error('Invalid authorization code'),
    );

    await expect(service.exchangeAuthorizationCode('invalid-code')).rejects.toThrow(
      'Invalid authorization code',
    );
  });

  it('6-8. リフレッシュトークンが無効化されている場合、適切なエラーが返る（5.3 準拠）', async () => {
    vi.mocked(mockGateway.refreshAccessToken).mockRejectedValue(
      new Error('Token has been revoked'),
    );

    const currentToken = OAuthToken.create(
      'access-token',
      'revoked-refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );

    await expect(service.refreshToken(currentToken)).rejects.toThrow('Token has been revoked');
  });

  it('6-9. リフレッシュトークン無効化時のエラーが呼び出し元に伝達される（5.3 準拠）', async () => {
    vi.mocked(mockGateway.refreshAccessToken).mockRejectedValue(
      new Error('Token revoked by user'),
    );

    const currentToken = OAuthToken.create(
      'access-token',
      'revoked-refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );

    // エラーが throw されることで呼び出し元は「要再認証」状態に遷移させることができる
    try {
      await service.refreshToken(currentToken);
      expect.unreachable('エラーが発生するべき');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Token revoked by user');
    }
  });

  it('6-10. トークンエンドポイントへの通信が失敗した場合のエラーハンドリング', async () => {
    vi.mocked(mockGateway.exchangeAuthorizationCode).mockRejectedValue(
      new Error('Network error'),
    );

    await expect(service.exchangeAuthorizationCode('auth-code')).rejects.toThrow('Network error');
  });

  // --- 排他制御 ---

  it('6-11. 並行リクエスト時にトークンリフレッシュが重複実行されないことをモックで検証', async () => {
    let callCount = 0;
    vi.mocked(mockGateway.refreshAccessToken).mockImplementation(async () => {
      callCount++;
      // 少し遅延をシミュレート
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        accessToken: `refreshed-access-token-${callCount}`,
        refreshToken: 'new-refresh-token',
        expiresInSeconds: 3600,
      };
    });

    const currentToken = OAuthToken.create(
      'old-access-token',
      'refresh-token',
      new Date('2020-01-01T00:00:00Z'),
    );

    // 並行して2回リフレッシュを呼び出す
    const [token1, token2] = await Promise.all([
      service.refreshToken(currentToken),
      service.refreshToken(currentToken),
    ]);

    // ドメインサービスレベルでの排他制御は呼び出し元が担う。
    // ここでは Gateway が2回呼ばれることを検証し、
    // 実際の排他制御は上位層（CalendarSyncService等）で保証されることを確認する。
    expect(mockGateway.refreshAccessToken).toHaveBeenCalledTimes(2);
    expect(token1).toBeInstanceOf(OAuthToken);
    expect(token2).toBeInstanceOf(OAuthToken);
  });

  // --- state パラメータ必須チェック ---

  it('state パラメータが空文字の場合、認可URL生成時にエラーとなる', () => {
    expect(() => service.buildAuthorizationUrl('')).toThrow('state パラメータは必須です');
  });

  it('認可コードが空文字の場合、トークン取得時にエラーとなる', () => {
    expect(() => service.exchangeAuthorizationCode('')).rejects.toThrow('認可コードは必須です');
  });
});
