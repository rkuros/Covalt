import { LineMessage, LineMessageSender } from './LineMessageSender';
import { NotificationMessage } from './NotificationMessage';
import { NotificationRecord } from './NotificationRecord';
import { NotificationRecordRepository } from './NotificationRecordRepository';
import { NotificationTemplateResolver } from './NotificationTemplateResolver';
import { NotificationType } from './NotificationType';
import { RecipientType } from './RecipientType';
import { ReservationEvent } from './ReservationEvent';
import { SendResult, SendErrorType } from './SendResult';

/**
 * 受信者種別に応じて顧客向け・オーナー向けの通知をそれぞれ生成・送信するサービス。
 *
 * 1 つの予約イベントに対し、顧客向けとオーナー向けでそれぞれ個別に送信を行う。
 * 顧客向けとオーナー向けの送信は互いに独立して処理する（一方の失敗が他方に影響しない）。
 */
export class NotificationDispatcher {
  constructor(
    private readonly templateResolver: NotificationTemplateResolver,
    private readonly messageSender: LineMessageSender,
    private readonly recordRepository: NotificationRecordRepository,
  ) {}

  /**
   * 顧客とオーナーの両方に通知を送信する。
   * BR-5: オーナー側からの変更・キャンセルでも顧客に通知する。
   * BR-6: 顧客側からの変更・キャンセルでもオーナーに通知する。
   */
  async dispatchBoth(
    notificationType: NotificationType,
    event: ReservationEvent,
  ): Promise<{ customer: SendResult; owner: SendResult }> {
    // 顧客向けとオーナー向けを独立して処理（互いに影響しない）
    const [customer, owner] = await Promise.allSettled([
      event.lineUserId
        ? this.dispatchTo(
            notificationType,
            RecipientType.Customer,
            event,
            event.lineUserId,
          )
        : Promise.resolve(
            SendResult.fail(SendErrorType.Skipped, 'lineUserId is null'),
          ),
      event.ownerLineUserId
        ? this.dispatchTo(
            notificationType,
            RecipientType.Owner,
            event,
            event.ownerLineUserId,
          )
        : Promise.resolve(
            SendResult.fail(SendErrorType.Skipped, 'ownerLineUserId is null'),
          ),
    ]);

    return {
      customer:
        customer.status === 'fulfilled'
          ? customer.value
          : SendResult.fail('UNKNOWN', String(customer.reason)),
      owner:
        owner.status === 'fulfilled'
          ? owner.value
          : SendResult.fail('UNKNOWN', String(owner.reason)),
    };
  }

  /**
   * 指定した受信者に通知を送信する。
   */
  private async dispatchTo(
    notificationType: NotificationType,
    recipientType: RecipientType,
    event: ReservationEvent,
    lineUserId: string,
  ): Promise<SendResult> {
    // テンプレート解決 -> メッセージ生成
    const message = this.templateResolver.resolve(
      notificationType,
      recipientType,
      event,
    );

    // LINE メッセージ送信
    const lineMessage: LineMessage = {
      type: 'text',
      text: message.body,
    };

    const sendResult = await this.messageSender.send(
      event.ownerId,
      lineUserId,
      [lineMessage],
    );

    // 送信記録を保存
    await this.saveRecord(
      event,
      notificationType,
      recipientType,
      lineUserId,
      sendResult,
    );

    // BR-7: USER_BLOCKED の場合はエラーを記録して正常終了
    if (sendResult.isUserBlocked) {
      console.warn(
        `ブロック済みユーザーへの送信をスキップしました: reservationId=${event.reservationId}, recipientType=${recipientType}`,
      );
    }

    return sendResult;
  }

  private async saveRecord(
    event: ReservationEvent,
    notificationType: NotificationType,
    recipientType: RecipientType,
    lineUserId: string,
    sendResult: SendResult,
  ): Promise<void> {
    const record = NotificationRecord.create({
      reservationId: event.reservationId,
      notificationType,
      recipientType,
      recipientLineUserId: lineUserId,
      ownerId: event.ownerId,
      sendResult,
    });
    await this.recordRepository.save(record);
  }
}
