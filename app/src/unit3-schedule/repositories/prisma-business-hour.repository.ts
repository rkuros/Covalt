import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BusinessHourRepository } from '../domain/BusinessHourRepository';
import { BusinessHour } from '../domain/BusinessHour';
import { BusinessHourId } from '../domain/BusinessHourId';
import { OwnerId } from '../domain/OwnerId';
import { DayOfWeek, DayOfWeekEnum } from '../domain/DayOfWeek';
import { TimeOfDay } from '../domain/TimeOfDay';

@Injectable()
export class PrismaBusinessHourRepository implements BusinessHourRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwnerIdAndDayOfWeek(
    ownerId: OwnerId,
    dayOfWeek: DayOfWeek,
  ): Promise<BusinessHour | null> {
    const row = await this.prisma.businessHour.findUnique({
      where: {
        ownerId_dayOfWeek: {
          ownerId: ownerId.value,
          dayOfWeek: dayOfWeek.value,
        },
      },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findAllByOwnerId(ownerId: OwnerId): Promise<BusinessHour[]> {
    const rows = await this.prisma.businessHour.findMany({
      where: { ownerId: ownerId.value },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(businessHour: BusinessHour): Promise<void> {
    await this.prisma.businessHour.upsert({
      where: {
        ownerId_dayOfWeek: {
          ownerId: businessHour.ownerId.value,
          dayOfWeek: businessHour.dayOfWeek.value,
        },
      },
      update: {
        startTime: businessHour.startTime?.toString() ?? null,
        endTime: businessHour.endTime?.toString() ?? null,
        isBusinessDay: businessHour.isBusinessDay,
      },
      create: {
        id: businessHour.businessHourId.value,
        ownerId: businessHour.ownerId.value,
        dayOfWeek: businessHour.dayOfWeek.value,
        startTime: businessHour.startTime?.toString() ?? null,
        endTime: businessHour.endTime?.toString() ?? null,
        isBusinessDay: businessHour.isBusinessDay,
      },
    });
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    dayOfWeek: string;
    startTime: string | null;
    endTime: string | null;
    isBusinessDay: boolean;
  }): BusinessHour {
    const startTime = row.startTime
      ? TimeOfDay.fromString(row.startTime)
      : TimeOfDay.create(0, 0);
    const endTime = row.endTime
      ? TimeOfDay.fromString(row.endTime)
      : TimeOfDay.create(0, 0);

    return BusinessHour.create({
      businessHourId: BusinessHourId.create(row.id),
      ownerId: OwnerId.create(row.ownerId),
      dayOfWeek: DayOfWeek.create(row.dayOfWeek as DayOfWeekEnum),
      startTime,
      endTime,
      isBusinessDay: row.isBusinessDay,
    });
  }
}
