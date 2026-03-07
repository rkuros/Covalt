/**
 * LIFF アクセストークン検証 Gateway インターフェース。
 * LINE Platform の Verify API への外部呼び出しを抽象化する。
 * 実装は後続の Integration フェーズで行う。
 */
export interface LiffVerificationResult {
  readonly lineUserId: string;
  readonly displayName: string;
}

export interface LiffVerificationGateway {
  /**
   * LIFF アクセストークンを LINE Platform に問い合わせて検証する。
   * @param accessToken LIFF アクセストークン
   * @returns 検証成功時の LINE ユーザー情報
   * @throws InvalidLiffTokenError トークンが無効な場合
   */
  verify(accessToken: string): Promise<LiffVerificationResult>;
}
