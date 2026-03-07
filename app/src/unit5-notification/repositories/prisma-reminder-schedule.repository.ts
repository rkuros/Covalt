import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * ReminderSchedule の Prisma リポジトリ。
 * ドメイン層の ReminderScheduler はインメモリ Map を使っているが、
 * 永続化が必要な場合はこのリポジトリを通じて DB に保存する。
 */

export interface ReminderScheduleRow {
  id: string;
  reservationId: string;
  scheduledAt: Date;
  isActive: boolean;
}

@Injectable()
export class PrismaReminderScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(params: {
    id: string;
    reservationId: string;
    scheduledAt: Date;
    isActive: boolean;
  }): Promise<void> {
    await this.prisma.reminderSchedule.upsert({
      where: { reservationId: params.reservationId },
      create: {
        id: params.id,
        reservationId: params.reservationId,
        scheduledAt: params.scheduledAt,
        isActive: params.isActive,
      },
      update: {
        scheduledAt: params.scheduledAt,
        isActive: params.isActive,
      },
    });
  }

  async findByReservationId(reservationId: string): Promise<ReminderScheduleRow | null> {
    return this.prisma.reminderSchedule.findUnique({
      where: { reservationId },
    });
  }

  async findDueReminders(asOf: Date): Promise<ReminderScheduleRow[]> {
    return this.prisma.reminderSchedule.findMany({
      where: {
        isActive: true,
        scheduledAt: { lte: asOf },
      },
    });
  }

  async deactivate(reservationId: string): Promise<void> {
    await this.prisma.reminderSchedule.updateMany({
      where: { reservationId },
      data: { isActive: false },
    });
  }
}
