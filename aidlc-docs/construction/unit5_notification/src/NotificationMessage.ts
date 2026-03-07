import { NotificationType } from "./NotificationType";
import { RecipientType } from "./RecipientType";

/**
 * 送信メッセージ本文を組み立てた結果を保持する不変オブジェクト。
 */
export class NotificationMessage {
  readonly notificationType: NotificationType;
  readonly recipientType: RecipientType;
  readonly body: string;

  private constructor(
    notificationType: NotificationType,
    recipientType: RecipientType,
    body: string
  ) {
    this.notificationType = notificationType;
    this.recipientType = recipientType;
    this.body = body;
  }

  /**
   * ファクトリメソッド。
   * body が空文字列の場合はエラーとする。
   */
  static create(
    notificationType: NotificationType,
    recipientType: RecipientType,
    body: string
  ): NotificationMessage {
    if (!body || body.trim().length === 0) {
      throw new Error("メッセージ本文は空にできません");
    }
    return Object.freeze(
      new NotificationMessage(notificationType, recipientType, body)
    );
  }
}
