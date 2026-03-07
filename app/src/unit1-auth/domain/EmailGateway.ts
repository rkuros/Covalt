/**
 * ゲートウェイインターフェース: EmailGateway
 * メール送信基盤への依存を抽象化する。
 * 実装は Integration フェーズで行う。
 */
export interface EmailGateway {
  /**
   * パスワードリセットリンクを送信する (BR-06)。
   */
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;

  /**
   * 初期設定用メールを送信する (BR-10)。
   */
  sendAccountSetupEmail(email: string, setupToken: string): Promise<void>;
}
