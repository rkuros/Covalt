import { NotificationMessage } from './NotificationMessage';
import { NotificationType } from './NotificationType';
import { RecipientType } from './RecipientType';
import { ReservationEvent, ReservationModifiedEvent } from './ReservationEvent';

/**
 * 通知種別と受信者種別からテンプレートを選択し、
 * イベントペイロードのフィールドを埋め込んでメッセージ本文を生成するサービス。
 */
export class NotificationTemplateResolver {
  /**
   * イベント種別 x 受信者種別 からテンプレートを選択しメッセージを生成する。
   */
  resolve(
    notificationType: NotificationType,
    recipientType: RecipientType,
    event: ReservationEvent,
  ): NotificationMessage {
    const body = this.buildBody(notificationType, recipientType, event);
    return NotificationMessage.create(notificationType, recipientType, body);
  }

  private buildBody(
    notificationType: NotificationType,
    recipientType: RecipientType,
    event: ReservationEvent,
  ): string {
    const dateTimeFormatted = this.formatDateTime(event.dateTime);

    // --- 顧客向け ---
    if (recipientType === RecipientType.Customer) {
      switch (notificationType) {
        case NotificationType.Confirmation:
          return ['予約が確定しました。', `日時: ${dateTimeFormatted}`].join(
            '\n',
          );

        case NotificationType.Modification: {
          const modified = event as ReservationModifiedEvent;
          return [
            '予約内容が変更されました。',
            `変更前の日時: ${this.formatDateTime(modified.previousDateTime)}`,
            `変更後の日時: ${dateTimeFormatted}`,
          ].join('\n');
        }

        case NotificationType.Cancellation:
          return [
            '予約がキャンセルされました。',
            `日時: ${dateTimeFormatted}`,
          ].join('\n');

        case NotificationType.Reminder:
          return [
            '明日のご予約のリマインドです。',
            `日時: ${dateTimeFormatted}`,
          ].join('\n');
      }
    }

    // --- オーナー向け ---
    if (recipientType === RecipientType.Owner) {
      switch (notificationType) {
        case NotificationType.Confirmation:
          return [
            '新しい予約が入りました。',
            `日時: ${dateTimeFormatted}`,
            `顧客名: ${event.customerName}`,
          ].join('\n');

        case NotificationType.Modification: {
          const modified = event as ReservationModifiedEvent;
          return [
            '予約内容が変更されました。',
            `変更前の日時: ${this.formatDateTime(modified.previousDateTime)}`,
            `変更後の日時: ${dateTimeFormatted}`,
            `顧客名: ${event.customerName}`,
          ].join('\n');
        }

        case NotificationType.Cancellation:
          return [
            '予約がキャンセルされました。',
            `日時: ${dateTimeFormatted}`,
            `顧客名: ${event.customerName}`,
          ].join('\n');

        case NotificationType.Reminder:
          // オーナー向けリマインダーは仕様上定義されていないが、
          // 型安全性のためフォールスルーを避ける
          return [
            '明日の予約のリマインドです。',
            `日時: ${dateTimeFormatted}`,
            `顧客名: ${event.customerName}`,
          ].join('\n');
      }
    }

    throw new Error(
      `未対応のテンプレート: notificationType=${notificationType}, recipientType=${recipientType}`,
    );
  }

  /**
   * ISO 8601 日時文字列を "YYYY-MM-DD HH:mm" 形式にフォーマットする。
   */
  private formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const dow = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${year}-${month}-${day}(${dow}) ${hours}:${minutes}`;
  }
}
