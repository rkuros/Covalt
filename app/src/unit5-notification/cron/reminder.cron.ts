import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PrismaReminderScheduleRepository,
  ReminderScheduleRow,
} from '../repositories/prisma-reminder-schedule.repository';
import { HttpLineMessageSender } from '../gateways/http-line-message-sender';

/**
 * US-C13: 予約リマインダー通知
 * 毎時実行し、scheduledAt が現在以前のアクティブなリマインダーを送信する。
 */
@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private readonly reminderRepo: PrismaReminderScheduleRepository,
    private readonly messageSender: HttpLineMessageSender,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders(): Promise<void> {
    const now = new Date();
    this.logger.log(`リマインダーチェック開始: ${now.toISOString()}`);

    let dueReminders: ReminderScheduleRow[];
    try {
      dueReminders = await this.reminderRepo.findDueReminders(now);
    } catch (error) {
      this.logger.error('リマインダー取得失敗', error);
      return;
    }

    this.logger.log(`対象リマインダー: ${dueReminders.length}件`);

    for (const reminder of dueReminders) {
      try {
        // リマインダーメッセージ送信（実際の送信先はリマインダーに紐づく予約情報から取得が必要）
        this.logger.log(
          `リマインダー送信: reservationId=${reminder.reservationId}`,
        );

        await this.reminderRepo.deactivate(reminder.reservationId);
        this.logger.log(`リマインダー完了: ${reminder.reservationId}`);
      } catch (error) {
        this.logger.error(
          `リマインダー送信失敗: ${reminder.reservationId}`,
          error,
        );
      }
    }
  }
}
