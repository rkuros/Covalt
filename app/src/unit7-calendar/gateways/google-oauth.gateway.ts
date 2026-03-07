import { Injectable } from '@nestjs/common';
import { GoogleOAuthGateway, OAuthTokenResponse } from '../domain/GoogleOAuthGateway';

/**
 * Google OAuth Gateway の仮実装。
 * 本番では Google OAuth 2.0 エンドポイントを呼び出す。現時点では console.log で代替する。
 */
@Injectable()
export class GoogleOAuthGatewayImpl implements GoogleOAuthGateway {
  private readonly clientId: string;
  private readonly redirectUri: string;

  constructor() {
    this.clientId = process.env['GOOGLE_CLIENT_ID'] ?? 'stub-client-id';
    this.redirectUri = process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3000/api/calendar/callback';
  }

  buildAuthorizationUrl(state: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('state', state);

    console.log('[Google OAuth] buildAuthorizationUrl called', {
      state,
      url: url.toString(),
    });

    return url.toString();
  }

  async exchangeAuthorizationCode(code: string): Promise<OAuthTokenResponse> {
    console.log('[Google OAuth] exchangeAuthorizationCode called', {
      code: code.substring(0, 8) + '...',
    });

    // Stub response
    return {
      accessToken: `stub-access-token-${Date.now()}`,
      refreshToken: `stub-refresh-token-${Date.now()}`,
      expiresInSeconds: 3600,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    console.log('[Google OAuth] refreshAccessToken called', {
      refreshToken: refreshToken.substring(0, 8) + '...',
    });

    // Stub response
    return {
      accessToken: `stub-refreshed-access-token-${Date.now()}`,
      refreshToken,
      expiresInSeconds: 3600,
    };
  }
}
