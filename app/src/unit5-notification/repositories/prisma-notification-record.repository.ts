import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationRecord } from '../domain/NotificationRecord';
import { NotificationRecordRepository } from '../domain/NotificationRecordRepository';
import { NotificationType } from '../domain/NotificationType';
import { RecipientType } from '../domain/RecipientType';
import { SendResult, SendErrorType } from '../domain/SendResult';

@Injectable()
export class PrismaNotificationRecordRepository implements NotificationRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(record: NotificationRecord): Promise<void> {
    await this.prisma.notificationRecord.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        reservationId: record.reservationId,
        notificationType: record.notificationType,
        recipientType: record.recipientType,
        lineUserId: record.recipientLineUserId,
        success: record.sendResult.success,
        messageId: record.sendResult.messageId,
        error: record.sendResult.errorMessage,
        sentAt: record.sentAt,
      },
      update: {
        success: record.sendResult.success,
        messageId: record.sendResult.messageId,
        error: record.sendResult.errorMessage,
        sentAt: record.sentAt,
      },
    });
  }

  async findByReservationId(reservationId: string): Promise<NotificationRecord[]> {
    const rows = await this.prisma.notificationRecord.findMany({
      where: { reservationId },
    });

    return rows.map((row) =>
      NotificationRecord.reconstruct({
        id: row.id,
        reservationId: row.reservationId,
        notificationType: row.notificationType as NotificationType,
        recipientType: row.recipientType as RecipientType,
        recipientLineUserId: row.lineUserId,
        ownerId: '',
        sendResult: row.success
          ? SendResult.ok(row.messageId ?? '')
          : SendResult.fail(
              (row.error as SendErrorType) ?? 'UNKNOWN',
              row.error ?? undefined,
            ),
        sentAt: row.sentAt,
      }),
    );
  }
}
