import { OAuthToken } from './OAuthToken';
import { GoogleOAuthGateway } from './GoogleOAuthGateway';

/**
 * サービス: GoogleOAuthService
 *
 * Google OAuth 2.0 認可コードフローの実行を担う。
 * 認可 URL 生成・トークン取得・トークンリフレッシュを提供する。
 */
export class GoogleOAuthService {
  constructor(private readonly oauthGateway: GoogleOAuthGateway) {}

  /**
   * OAuth 認可 URL を生成する。
   * BR-1.1: オーナーは Web 管理画面から Google アカウントで OAuth 認証を行う。
   */
  buildAuthorizationUrl(state: string): string {
    if (!state) {
      throw new Error('state パラメータは必須です');
    }
    return this.oauthGateway.buildAuthorizationUrl(state);
  }

  /**
   * 認可コードを使ってトークンを取得し、OAuthToken 値オブジェクトを返す。
   */
  async exchangeAuthorizationCode(code: string): Promise<OAuthToken> {
    if (!code) {
      throw new Error('認可コードは必須です');
    }

    const response = await this.oauthGateway.exchangeAuthorizationCode(code);
    const expiresAt = new Date(Date.now() + response.expiresInSeconds * 1000);

    return OAuthToken.create(response.accessToken, response.refreshToken, expiresAt);
  }

  /**
   * リフレッシュトークンを使って新しいアクセストークンを取得する。
   * 既存の OAuthToken を受け取り、リフレッシュ後の OAuthToken を返す。
   */
  async refreshToken(currentToken: OAuthToken): Promise<OAuthToken> {
    const response = await this.oauthGateway.refreshAccessToken(currentToken.refreshToken);
    const newExpiresAt = new Date(Date.now() + response.expiresInSeconds * 1000);

    return currentToken.withRefreshedAccessToken(
      response.accessToken,
      newExpiresAt,
      response.refreshToken || undefined,
    );
  }
}
