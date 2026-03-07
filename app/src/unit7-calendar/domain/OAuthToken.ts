/**
 * 値オブジェクト: OAuthToken
 *
 * アクセストークン・リフレッシュトークン・有効期限をまとめた不変オブジェクト。
 * トークンの期限切れ判定とリフレッシュ要否の判定を担う。
 */
export class OAuthToken {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;

  private constructor(accessToken: string, refreshToken: string, expiresAt: Date) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt;
  }

  /**
   * ファクトリメソッド: 新しい OAuthToken を生成する。
   */
  static create(accessToken: string, refreshToken: string, expiresAt: Date): OAuthToken {
    if (!accessToken) {
      throw new Error('accessToken は必須です');
    }
    if (!refreshToken) {
      throw new Error('refreshToken は必須です');
    }
    if (!(expiresAt instanceof Date) || isNaN(expiresAt.getTime())) {
      throw new Error('expiresAt は有効な日付である必要があります');
    }
    return new OAuthToken(accessToken, refreshToken, expiresAt);
  }

  /**
   * トークンが期限切れかどうかを判定する。
   * 安全マージンとして5分前に期限切れとみなす。
   */
  isExpired(now: Date = new Date()): boolean {
    const bufferMs = 5 * 60 * 1000; // 5分のバッファ
    return now.getTime() >= this.expiresAt.getTime() - bufferMs;
  }

  /**
   * リフレッシュが必要かどうかを判定する。
   * 期限切れ、または期限切れ間近（5分以内）の場合に true を返す。
   */
  needsRefresh(now: Date = new Date()): boolean {
    return this.isExpired(now);
  }

  /**
   * 新しいアクセストークンと有効期限でトークンを更新した新しい OAuthToken を返す。
   * リフレッシュトークンは変更がなければ既存のものを引き継ぐ。
   */
  withRefreshedAccessToken(
    newAccessToken: string,
    newExpiresAt: Date,
    newRefreshToken?: string,
  ): OAuthToken {
    return OAuthToken.create(
      newAccessToken,
      newRefreshToken ?? this.refreshToken,
      newExpiresAt,
    );
  }

  equals(other: OAuthToken): boolean {
    return (
      this.accessToken === other.accessToken &&
      this.refreshToken === other.refreshToken &&
      this.expiresAt.getTime() === other.expiresAt.getTime()
    );
  }
}
