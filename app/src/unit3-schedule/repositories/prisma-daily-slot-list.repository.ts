import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DailySlotListRepository } from '../domain/DailySlotListRepository';
import { DailySlotList } from '../domain/DailySlotList';
import { Slot } from '../domain/Slot';
import { SlotId } from '../domain/SlotId';
import { OwnerId } from '../domain/OwnerId';
import { SlotDate } from '../domain/SlotDate';
import { Version } from '../domain/Version';
import { TimeOfDay } from '../domain/TimeOfDay';
import { Duration } from '../domain/Duration';
import { SlotStatus, SlotStatusEnum } from '../domain/SlotStatus';
import { ReservationId } from '../domain/ReservationId';
import { OptimisticLockError } from '../domain/DomainErrors';

interface SlotRow {
  id: string;
  dailySlotListId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  reservationId: string | null;
}

interface DailySlotListRow {
  id: string;
  ownerId: string;
  date: string;
  version: number;
  slots: SlotRow[];
}

@Injectable()
export class PrismaDailySlotListRepository implements DailySlotListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOwnerIdAndDate(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<DailySlotList | null> {
    const row = await this.prisma.dailySlotList.findUnique({
      where: {
        ownerId_date: {
          ownerId: ownerId.value,
          date: date.value,
        },
      },
      include: { slots: true },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findSlotById(
    slotId: SlotId,
  ): Promise<{ dailySlotList: DailySlotList; slot: Slot } | null> {
    const slotRow = await this.prisma.slot.findUnique({
      where: { id: slotId.value },
      include: {
        dailySlotList: {
          include: { slots: true },
        },
      },
    });
    if (!slotRow) return null;

    const dailySlotList = this.toDomain(slotRow.dailySlotList);
    const slot = dailySlotList.findSlotById(slotId);
    if (!slot) return null;

    return { dailySlotList, slot };
  }

  async findAllByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: SlotDate,
    endDate: SlotDate,
  ): Promise<DailySlotList[]> {
    const rows = await this.prisma.dailySlotList.findMany({
      where: {
        ownerId: ownerId.value,
        date: { gte: startDate.value, lte: endDate.value },
      },
      include: { slots: true },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(dailySlotList: DailySlotList): Promise<void> {
    const ownerId = dailySlotList.ownerId.value;
    const date = dailySlotList.date.value;

    await this.prisma.$transaction(async (tx) => {
      // Check if the record already exists
      const existing = await tx.dailySlotList.findUnique({
        where: {
          ownerId_date: { ownerId, date },
        },
      });

      if (existing) {
        // Optimistic lock check: the stored version must be exactly one less
        // than the domain object's version (which was incremented by domain operations).
        const expectedPreviousVersion = dailySlotList.version.value - 1;
        if (existing.version !== expectedPreviousVersion) {
          throw new OptimisticLockError();
        }

        // Update the version and replace all slots
        await tx.dailySlotList.update({
          where: { id: existing.id },
          data: { version: dailySlotList.version.value },
        });

        // Delete all existing slots and recreate them
        await tx.slot.deleteMany({
          where: { dailySlotListId: existing.id },
        });

        if (dailySlotList.slots.length > 0) {
          await tx.slot.createMany({
            data: dailySlotList.slots.map((slot) => ({
              id: slot.slotId.value,
              dailySlotListId: existing.id,
              startTime: slot.startTime.toString(),
              endTime: slot.endTime.toString(),
              durationMinutes: slot.durationMinutes,
              status: slot.status.toPact(),
              reservationId: slot.reservationId?.value ?? null,
            })),
          });
        }
      } else {
        // Create new DailySlotList with all slots
        await tx.dailySlotList.create({
          data: {
            ownerId,
            date,
            version: dailySlotList.version.value,
            slots: {
              create: dailySlotList.slots.map((slot) => ({
                id: slot.slotId.value,
                startTime: slot.startTime.toString(),
                endTime: slot.endTime.toString(),
                durationMinutes: slot.durationMinutes,
                status: slot.status.toPact(),
                reservationId: slot.reservationId?.value ?? null,
              })),
            },
          },
        });
      }
    });
  }

  private toDomain(row: DailySlotListRow): DailySlotList {
    const slots = row.slots.map((slotRow) => this.toSlotDomain(slotRow));
    return DailySlotList.create({
      ownerId: OwnerId.create(row.ownerId),
      date: SlotDate.create(row.date),
      version: Version.create(row.version),
      slots,
    });
  }

  private toSlotDomain(row: SlotRow): Slot {
    const startTime = TimeOfDay.fromString(row.startTime);
    const endTime = TimeOfDay.fromString(row.endTime);
    const duration = Duration.create(row.durationMinutes);
    const statusValue =
      row.status === 'available'
        ? SlotStatusEnum.AVAILABLE
        : SlotStatusEnum.BOOKED;
    const status = SlotStatus.create(statusValue);
    const reservationId = row.reservationId
      ? ReservationId.create(row.reservationId)
      : null;

    return Slot.create({
      slotId: SlotId.create(row.id),
      startTime,
      endTime,
      durationMinutes: duration,
      status,
      reservationId,
    });
  }
}
