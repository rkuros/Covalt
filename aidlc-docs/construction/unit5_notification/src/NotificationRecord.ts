import { NotificationType } from "./NotificationType";
import { RecipientType } from "./RecipientType";
import { SendResult } from "./SendResult";

/**
 * 送信済み通知の記録エンティティ。
 * 通知種別・送信先・送信日時・送信結果を保持する。
 */
export class NotificationRecord {
  readonly id: string;
  readonly reservationId: string;
  readonly notificationType: NotificationType;
  readonly recipientType: RecipientType;
  readonly recipientLineUserId: string;
  readonly ownerId: string;
  readonly sendResult: SendResult;
  readonly sentAt: Date;

  private constructor(params: {
    id: string;
    reservationId: string;
    notificationType: NotificationType;
    recipientType: RecipientType;
    recipientLineUserId: string;
    ownerId: string;
    sendResult: SendResult;
    sentAt: Date;
  }) {
    this.id = params.id;
    this.reservationId = params.reservationId;
    this.notificationType = params.notificationType;
    this.recipientType = params.recipientType;
    this.recipientLineUserId = params.recipientLineUserId;
    this.ownerId = params.ownerId;
    this.sendResult = params.sendResult;
    this.sentAt = params.sentAt;
  }

  /**
   * ファクトリメソッド。
   * ID は crypto.randomUUID() で生成する。
   */
  static create(params: {
    reservationId: string;
    notificationType: NotificationType;
    recipientType: RecipientType;
    recipientLineUserId: string;
    ownerId: string;
    sendResult: SendResult;
  }): NotificationRecord {
    return new NotificationRecord({
      id: crypto.randomUUID(),
      reservationId: params.reservationId,
      notificationType: params.notificationType,
      recipientType: params.recipientType,
      recipientLineUserId: params.recipientLineUserId,
      ownerId: params.ownerId,
      sendResult: params.sendResult,
      sentAt: new Date(),
    });
  }

  /**
   * 永続化データからの復元用ファクトリ。
   */
  static reconstruct(params: {
    id: string;
    reservationId: string;
    notificationType: NotificationType;
    recipientType: RecipientType;
    recipientLineUserId: string;
    ownerId: string;
    sendResult: SendResult;
    sentAt: Date;
  }): NotificationRecord {
    return new NotificationRecord(params);
  }
}
