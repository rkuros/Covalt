/**
 * リマインダーのスケジュールエントリ。
 */
export interface ReminderEntry {
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly lineUserId: string;
  readonly ownerLineUserId: string;
  readonly slotId: string;
  readonly dateTime: string;
  /** 発火予定日時（予約日の前日）*/
  readonly scheduledAt: Date;
}

/**
 * 予約日の前日にリマインダー通知を発火するスケジューリングを管理するサービス。
 * - 予約作成時にスケジュール登録
 * - 予約変更時に既存スケジュール削除 + 新日時で再登録
 * - 予約キャンセル時にスケジュール削除（BR-1, BR-2）
 */
export class ReminderScheduler {
  private readonly schedules: Map<string, ReminderEntry> = new Map();

  /**
   * リマインダースケジュールを登録する。
   * 予約日の前日を発火日時として設定する（BR-4）。
   */
  schedule(params: {
    reservationId: string;
    ownerId: string;
    customerId: string;
    customerName: string;
    lineUserId: string;
    ownerLineUserId: string;
    slotId: string;
    dateTime: string;
  }): void {
    const scheduledAt = this.calculateReminderDate(params.dateTime);

    const entry: ReminderEntry = {
      reservationId: params.reservationId,
      ownerId: params.ownerId,
      customerId: params.customerId,
      customerName: params.customerName,
      lineUserId: params.lineUserId,
      ownerLineUserId: params.ownerLineUserId,
      slotId: params.slotId,
      dateTime: params.dateTime,
      scheduledAt,
    };

    this.schedules.set(params.reservationId, entry);
  }

  /**
   * 登録済みリマインダースケジュールを削除する（BR-2）。
   * キャンセル済み予約にはリマインダーを送信しない（BR-1）。
   */
  cancel(reservationId: string): void {
    this.schedules.delete(reservationId);
  }

  /**
   * 予約変更時にスケジュールを新しい日時で再登録する（BR-3）。
   * 既存スケジュールを削除し、新日時で再登録する。
   */
  reschedule(params: {
    reservationId: string;
    ownerId: string;
    customerId: string;
    customerName: string;
    lineUserId: string;
    ownerLineUserId: string;
    slotId: string;
    dateTime: string;
  }): void {
    this.cancel(params.reservationId);
    this.schedule(params);
  }

  /**
   * 指定した予約のリマインダースケジュールを取得する。
   */
  getSchedule(reservationId: string): ReminderEntry | undefined {
    return this.schedules.get(reservationId);
  }

  /**
   * 発火対象のリマインダーを取得する。
   * 指定日時以前に scheduledAt が設定されているエントリを返す。
   */
  getDueReminders(asOf: Date): ReminderEntry[] {
    return Array.from(this.schedules.values()).filter(
      (entry) => entry.scheduledAt <= asOf
    );
  }

  /**
   * 予約日の前日を計算する（BR-4）。
   * 予約日時から24時間前の日時を返す。
   */
  private calculateReminderDate(dateTimeIso: string): Date {
    const reservationDate = new Date(dateTimeIso);
    const reminderDate = new Date(reservationDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    return reminderDate;
  }
}
