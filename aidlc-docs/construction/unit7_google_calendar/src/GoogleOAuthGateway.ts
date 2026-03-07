/**
 * OAuth トークンレスポンスの型。
 */
export interface OAuthTokenResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresInSeconds: number;
}

/**
 * Gateway インターフェース: GoogleOAuthGateway
 *
 * Google OAuth 2.0 認可コードフローの通信を担うインフラストラクチャサービス。
 * 実装は Integration フェーズで提供する。
 */
export interface GoogleOAuthGateway {
  /**
   * OAuth 認可 URL を生成する。
   * エンドポイント: https://accounts.google.com/o/oauth2/v2/auth
   */
  buildAuthorizationUrl(state: string): string;

  /**
   * 認可コードを使ってアクセストークンとリフレッシュトークンを取得する。
   * エンドポイント: https://oauth2.googleapis.com/token
   */
  exchangeAuthorizationCode(code: string): Promise<OAuthTokenResponse>;

  /**
   * リフレッシュトークンを使って新しいアクセストークンを取得する。
   * エンドポイント: https://oauth2.googleapis.com/token
   */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse>;
}
