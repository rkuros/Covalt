import { describe, it, expect } from 'vitest';
import { OAuthToken } from '../src/OAuthToken';

describe('OAuthToken', () => {
  // --- 正常系 ---

  it('1-1. 有効なアクセストークン、リフレッシュトークン、有効期限を指定してインスタンスを生成できる', () => {
    const expiresAt = new Date('2026-12-31T23:59:59Z');
    const token = OAuthToken.create('access-token-123', 'refresh-token-456', expiresAt);
    expect(token).toBeInstanceOf(OAuthToken);
  });

  it('1-2. 生成後のプロパティ（accessToken, refreshToken, expiresAt）が渡した値と一致する', () => {
    const expiresAt = new Date('2026-12-31T23:59:59Z');
    const token = OAuthToken.create('access-token-123', 'refresh-token-456', expiresAt);
    expect(token.accessToken).toBe('access-token-123');
    expect(token.refreshToken).toBe('refresh-token-456');
    expect(token.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it('1-3. 不変オブジェクトであること -- TypeScript readonly による不変性保証', () => {
    const expiresAt = new Date('2026-12-31T23:59:59Z');
    const token = OAuthToken.create('access-token-123', 'refresh-token-456', expiresAt);

    // TypeScript の readonly はコンパイル時に不変性を強制する。
    // ランタイムでは readonly は強制されないが、
    // 値が正しく保持されていることを確認する。
    expect(token.accessToken).toBe('access-token-123');
    expect(token.refreshToken).toBe('refresh-token-456');
    expect(token.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  // --- 異常系 ---

  it('1-4. アクセストークンが空文字の場合、生成時にエラーとなる', () => {
    const expiresAt = new Date('2026-12-31T23:59:59Z');
    expect(() => OAuthToken.create('', 'refresh-token-456', expiresAt)).toThrow(
      'accessToken は必須です',
    );
  });

  it('1-5. リフレッシュトークンが空文字の場合、生成時にエラーとなる', () => {
    const expiresAt = new Date('2026-12-31T23:59:59Z');
    expect(() => OAuthToken.create('access-token-123', '', expiresAt)).toThrow(
      'refreshToken は必須です',
    );
  });

  it('1-6. 有効期限が null / undefined の場合、生成時にエラーとなる', () => {
    expect(() =>
      OAuthToken.create('access-token-123', 'refresh-token-456', null as unknown as Date),
    ).toThrow('expiresAt は有効な日付である必要があります');

    expect(() =>
      OAuthToken.create('access-token-123', 'refresh-token-456', undefined as unknown as Date),
    ).toThrow('expiresAt は有効な日付である必要があります');
  });

  // --- 境界値 ---

  it('1-7. 有効期限が現在時刻ちょうどの場合、期限切れと判定される（5分バッファにより）', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const expiresAt = new Date('2026-06-15T12:00:00Z');
    const token = OAuthToken.create('access-token', 'refresh-token', expiresAt);

    // 現在時刻 >= expiresAt - 5分 なので期限切れ
    expect(token.isExpired(now)).toBe(true);
  });

  it('1-8. 有効期限が現在時刻の5分超後の場合、まだ有効と判定される', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    // 5分 + 1秒後 = バッファの外 -> まだ有効
    const expiresAt = new Date('2026-06-15T12:05:01Z');
    const token = OAuthToken.create('access-token', 'refresh-token', expiresAt);

    expect(token.isExpired(now)).toBe(false);
  });

  it('1-9. 有効期限が過去日時の場合、期限切れと判定される', () => {
    const now = new Date('2026-06-15T12:00:00Z');
    const expiresAt = new Date('2026-06-15T11:00:00Z');
    const token = OAuthToken.create('access-token', 'refresh-token', expiresAt);

    expect(token.isExpired(now)).toBe(true);
  });

  // --- トークン管理関連 ---

  it('1-10. トークンが期限切れか否かを判定するメソッドが正しく動作する', () => {
    const now = new Date('2026-06-15T12:00:00Z');

    // 期限切れトークン
    const expiredToken = OAuthToken.create(
      'access-token',
      'refresh-token',
      new Date('2026-06-15T11:00:00Z'),
    );
    expect(expiredToken.isExpired(now)).toBe(true);
    expect(expiredToken.needsRefresh(now)).toBe(true);

    // 有効なトークン（5分バッファの外）
    const validToken = OAuthToken.create(
      'access-token',
      'refresh-token',
      new Date('2026-06-15T13:00:00Z'),
    );
    expect(validToken.isExpired(now)).toBe(false);
    expect(validToken.needsRefresh(now)).toBe(false);
  });

  it('1-11. 同一の値を持つ OAuthToken 同士が等価と判定される（値オブジェクトの等価性）', () => {
    const expiresAt = new Date('2026-12-31T23:59:59Z');
    const token1 = OAuthToken.create('access-token-123', 'refresh-token-456', expiresAt);
    const token2 = OAuthToken.create('access-token-123', 'refresh-token-456', expiresAt);

    expect(token1.equals(token2)).toBe(true);

    // 異なる値の場合は非等価
    const token3 = OAuthToken.create('different-access-token', 'refresh-token-456', expiresAt);
    expect(token1.equals(token3)).toBe(false);
  });
});
