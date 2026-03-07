import { NotificationDispatcher } from "./NotificationDispatcher";
import { NotificationType } from "./NotificationType";
import { ReminderScheduler } from "./ReminderScheduler";
import {
  ReservationCancelledEvent,
  ReservationCreatedEvent,
  ReservationEvent,
  ReservationModifiedEvent,
} from "./ReservationEvent";

/**
 * 予約イベント（created / modified / cancelled）を購読し、
 * 適切な通知処理を振り分けるサービス。
 */
export class ReservationEventHandler {
  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly reminderScheduler: ReminderScheduler
  ) {}

  /**
   * 予約イベントを受信して処理を振り分ける。
   */
  async handle(event: ReservationEvent): Promise<void> {
    switch (event.eventType) {
      case "reservation.created":
        await this.handleCreated(event);
        break;
      case "reservation.modified":
        await this.handleModified(event);
        break;
      case "reservation.cancelled":
        await this.handleCancelled(event);
        break;
    }
  }

  /**
   * 予約作成イベントの処理。
   * - 顧客向け: 予約確定通知
   * - オーナー向け: 新規予約通知
   * - リマインダースケジュール登録
   */
  private async handleCreated(event: ReservationCreatedEvent): Promise<void> {
    await this.dispatcher.dispatchBoth(NotificationType.Confirmation, event);

    this.reminderScheduler.schedule({
      reservationId: event.reservationId,
      ownerId: event.ownerId,
      customerId: event.customerId,
      customerName: event.customerName,
      lineUserId: event.lineUserId,
      ownerLineUserId: event.ownerLineUserId,
      slotId: event.slotId,
      dateTime: event.dateTime,
    });
  }

  /**
   * 予約変更イベントの処理。
   * - 顧客向け: 予約変更通知（BR-5: オーナーが変更した場合も含む）
   * - オーナー向け: 予約変更通知（BR-6: 顧客が変更した場合も含む）
   * - リマインダー: 既存スケジュール削除 + 新日時で再登録（BR-3）
   */
  private async handleModified(
    event: ReservationModifiedEvent
  ): Promise<void> {
    await this.dispatcher.dispatchBoth(NotificationType.Modification, event);

    this.reminderScheduler.reschedule({
      reservationId: event.reservationId,
      ownerId: event.ownerId,
      customerId: event.customerId,
      customerName: event.customerName,
      lineUserId: event.lineUserId,
      ownerLineUserId: event.ownerLineUserId,
      slotId: event.slotId,
      dateTime: event.dateTime,
    });
  }

  /**
   * 予約キャンセルイベントの処理。
   * - 顧客向け: キャンセル通知（BR-5: オーナーがキャンセルした場合も含む）
   * - オーナー向け: キャンセル通知（BR-6: 顧客がキャンセルした場合も含む）
   * - リマインダー: 登録済みスケジュールを削除（BR-1, BR-2）
   */
  private async handleCancelled(
    event: ReservationCancelledEvent
  ): Promise<void> {
    await this.dispatcher.dispatchBoth(NotificationType.Cancellation, event);

    // BR-1: キャンセル済み予約にはリマインダーを送信しない
    // BR-2: 登録済みリマインダースケジュールを削除する
    this.reminderScheduler.cancel(event.reservationId);
  }
}
