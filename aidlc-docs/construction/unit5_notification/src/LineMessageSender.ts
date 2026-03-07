import { SendResult } from "./SendResult";

/**
 * LINE メッセージの種別。
 */
export interface LineMessage {
  readonly type: "text" | "flex";
  readonly text: string;
}

/**
 * Unit 2 Messaging API (POST /api/line/messages/push) を呼び出すための
 * Gateway インターフェース。
 * 実装は Integration フェーズで提供される。
 */
export interface LineMessageSender {
  /**
   * 指定した LINE ユーザーにプッシュメッセージを送信する。
   *
   * @param ownerId - メッセージ送信元のオーナー ID（LINE 公式アカウント特定用）
   * @param lineUserId - 送信先の LINE ユーザー ID（U + 32桁 hex）
   * @param messages - 送信するメッセージ配列（1件以上）
   * @returns 送信結果
   */
  send(
    ownerId: string,
    lineUserId: string,
    messages: readonly LineMessage[]
  ): Promise<SendResult>;
}
