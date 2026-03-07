/**
 * LiffGateway - Unit 2（LINE 連携基盤）の LIFF トークン検証 API 用 Gateway インターフェース
 */

export interface LiffVerifyResult {
  readonly lineUserId: string;   // U + 32桁hex
  readonly displayName: string;
}

export interface LiffGateway {
  /** LIFF アクセストークンを検証し、LINE ユーザー情報を取得する。顧客操作時の認証に使用。 */
  verifyLiffToken(accessToken: string): Promise<LiffVerifyResult>;
}
