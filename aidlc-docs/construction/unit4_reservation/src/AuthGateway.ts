/**
 * AuthGateway - Unit 1（認証・アカウント管理）の認証 API 用 Gateway インターフェース
 */

export interface AuthResult {
  readonly ownerId: string;
  readonly email: string;
  readonly role: 'owner' | 'admin';
}

export interface AuthGateway {
  /** オーナーの認証トークンを検証する。Web 管理画面からの操作時に使用。 */
  verifyToken(token: string): Promise<AuthResult>;
}
