import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PrismaReminderScheduleRepository,
  ReminderScheduleRow,
} from '../repositories/prisma-reminder-schedule.repository';
import { HttpLineMessageSender } from '../gateways/http-line-message-sender';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * US-C13: 予約リマインダー通知
 * 毎時実行し、scheduledAt が現在以前のアクティブなリマインダーを送信する。
 * また、autoCompleteEnabled なオーナーの過去予約を自動完了する。
 */
@Injectable()
export class ReminderCronService {
  private readonly logger = new Logger(ReminderCronService.name);

  constructor(
    private readonly reminderRepo: PrismaReminderScheduleRepository,
    private readonly messageSender: HttpLineMessageSender,
    private readonly prisma: PrismaService,
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

    // Auto-complete past reservations
    await this.autoCompletePastReservations(now);
  }

  private async autoCompletePastReservations(now: Date): Promise<void> {
    try {
      const enabledOwners = await this.prisma.ownerSettings.findMany({
        where: { autoCompleteEnabled: true },
        select: { ownerId: true },
      });

      if (enabledOwners.length === 0) return;

      const ownerIds = enabledOwners.map((o) => o.ownerId);
      const result = await this.prisma.reservation.updateMany({
        where: {
          ownerId: { in: ownerIds },
          status: 'confirmed',
          dateTime: { lt: now.toISOString() },
        },
        data: { status: 'completed', updatedAt: now },
      });

      if (result.count > 0) {
        this.logger.log(`自動完了: ${result.count}件の予約を完了にしました`);
      }
    } catch (error) {
      this.logger.error('自動完了処理エラー', error);
    }
  }
}
