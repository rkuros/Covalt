import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClosedDayRepository } from '../domain/ClosedDayRepository';
import { ClosedDay } from '../domain/ClosedDay';
import { ClosedDayId } from '../domain/ClosedDayId';
import { OwnerId } from '../domain/OwnerId';
import { SlotDate } from '../domain/SlotDate';

@Injectable()
export class PrismaClosedDayRepository implements ClosedDayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwnerIdAndDate(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<ClosedDay | null> {
    const row = await this.prisma.closedDay.findUnique({
      where: {
        ownerId_date: {
          ownerId: ownerId.value,
          date: date.value,
        },
      },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findAllByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: SlotDate,
    endDate: SlotDate,
  ): Promise<ClosedDay[]> {
    const rows = await this.prisma.closedDay.findMany({
      where: {
        ownerId: ownerId.value,
        date: {
          gte: startDate.value,
          lte: endDate.value,
        },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(closedDay: ClosedDay): Promise<void> {
    await this.prisma.closedDay.upsert({
      where: {
        ownerId_date: {
          ownerId: closedDay.ownerId.value,
          date: closedDay.date.value,
        },
      },
      update: {
        reason: closedDay.reason,
      },
      create: {
        id: closedDay.closedDayId.value,
        ownerId: closedDay.ownerId.value,
        date: closedDay.date.value,
        reason: closedDay.reason,
      },
    });
  }

  async delete(closedDay: ClosedDay): Promise<void> {
    await this.prisma.closedDay.delete({
      where: { id: closedDay.closedDayId.value },
    });
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    date: string;
    reason: string | null;
  }): ClosedDay {
    return ClosedDay.create({
      closedDayId: ClosedDayId.create(row.id),
      ownerId: OwnerId.create(row.ownerId),
      date: SlotDate.create(row.date),
      reason: row.reason,
    });
  }
}
