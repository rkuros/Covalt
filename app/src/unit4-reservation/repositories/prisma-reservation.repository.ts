import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ReservationRepository } from '../domain/ReservationRepository';
import { Reservation } from '../domain/Reservation';
import { ReservationId } from '../domain/ReservationId';
import { CustomerId } from '../domain/CustomerId';
import { OwnerId } from '../domain/OwnerId';
import { SlotId } from '../domain/SlotId';
import { ReservationDateTime } from '../domain/ReservationDateTime';
import { DurationMinutes } from '../domain/DurationMinutes';
import { ReservationStatus } from '../domain/ReservationStatus';
import { CustomerName } from '../domain/CustomerName';
import { LineUserId } from '../domain/LineUserId';
import { ActorType } from '../domain/ActorType';
import { ReservationHistory } from '../domain/ReservationHistory';
import { HistoryId } from '../domain/HistoryId';
import { ChangeType } from '../domain/ChangeType';
import type {
  Reservation as PrismaReservation,
  ReservationHistory as PrismaHistory,
} from '@prisma/client';

@Injectable()
export class PrismaReservationRepository implements ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(reservation: Reservation): Promise<void> {
    const data = {
      ownerId: reservation.ownerId.value,
      customerId: reservation.customerId.value,
      slotId: reservation.slotId.value,
      dateTime: reservation.dateTime.toISOString(),
      durationMinutes: reservation.durationMinutes.value,
      status: reservation.status,
      customerName: reservation.customerName.value,
      lineUserId: reservation.lineUserId?.value ?? null,
      ownerLineUserId: reservation.ownerLineUserId?.value ?? null,
      createdBy: reservation.createdBy,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };

    const newHistories = reservation.histories;

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.upsert({
        where: { id: reservation.reservationId.value },
        create: {
          id: reservation.reservationId.value,
          ...data,
        },
        update: {
          slotId: data.slotId,
          dateTime: data.dateTime,
          durationMinutes: data.durationMinutes,
          status: data.status,
          updatedAt: data.updatedAt,
        },
      });

      // Upsert histories (insert new ones that don't exist yet)
      for (const history of newHistories) {
        await tx.reservationHistory.upsert({
          where: { id: history.historyId.value },
          create: {
            id: history.historyId.value,
            reservationId: reservation.reservationId.value,
            changeType: history.changeType,
            previousDateTime: history.previousDateTime?.toISOString() ?? null,
            newDateTime: history.newDateTime?.toISOString() ?? null,
            previousSlotId: history.previousSlotId?.value ?? null,
            newSlotId: history.newSlotId?.value ?? null,
            changedBy: history.changedBy,
            changedAt: history.changedAt,
          },
          update: {},
        });
      }
    });
  }

  async findById(reservationId: ReservationId): Promise<Reservation | null> {
    const record = await this.prisma.reservation.findUnique({
      where: { id: reservationId.value },
      include: { histories: true },
    });

    if (!record) return null;

    return this.toDomain(record, record.histories);
  }

  async findUpcomingByCustomerId(
    customerId: CustomerId,
    ownerId: OwnerId,
  ): Promise<Reservation[]> {
    const now = new Date();
    const records = await this.prisma.reservation.findMany({
      where: {
        customerId: customerId.value,
        ownerId: ownerId.value,
        status: ReservationStatus.Confirmed,
        dateTime: { gte: now.toISOString() },
      },
      include: { histories: true },
      orderBy: { dateTime: 'asc' },
    });

    return records.map((r) => this.toDomain(r, r.histories));
  }

  async findPastByCustomerId(
    customerId: CustomerId,
    ownerId: OwnerId,
  ): Promise<Reservation[]> {
    const now = new Date();
    const records = await this.prisma.reservation.findMany({
      where: {
        customerId: customerId.value,
        ownerId: ownerId.value,
        OR: [
          { dateTime: { lt: now.toISOString() } },
          { status: ReservationStatus.Cancelled },
          { status: ReservationStatus.Completed },
        ],
      },
      include: { histories: true },
      orderBy: { dateTime: 'desc' },
    });

    return records.map((r) => this.toDomain(r, r.histories));
  }

  async findByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: Date,
    endDate: Date,
  ): Promise<Reservation[]> {
    const records = await this.prisma.reservation.findMany({
      where: {
        ownerId: ownerId.value,
        dateTime: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      include: { histories: true },
      orderBy: { dateTime: 'asc' },
    });

    return records.map((r) => this.toDomain(r, r.histories));
  }

  async findByOwnerIdAndStatus(
    ownerId: OwnerId,
    status: ReservationStatus,
  ): Promise<Reservation[]> {
    const records = await this.prisma.reservation.findMany({
      where: {
        ownerId: ownerId.value,
        status,
      },
      include: { histories: true },
      orderBy: { dateTime: 'asc' },
    });

    return records.map((r) => this.toDomain(r, r.histories));
  }

  async findByOwnerIdAndDateRangeAndStatus(
    ownerId: OwnerId,
    startDate: Date,
    endDate: Date,
    status: ReservationStatus,
  ): Promise<Reservation[]> {
    const records = await this.prisma.reservation.findMany({
      where: {
        ownerId: ownerId.value,
        status,
        dateTime: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      include: { histories: true },
      orderBy: { dateTime: 'asc' },
    });

    return records.map((r) => this.toDomain(r, r.histories));
  }

  private toDomain(
    record: PrismaReservation,
    histories: PrismaHistory[],
  ): Reservation {
    const domainHistories = histories.map((h) =>
      ReservationHistory.reconstruct({
        historyId: HistoryId.create(h.id),
        changeType: h.changeType as ChangeType,
        previousDateTime: h.previousDateTime
          ? ReservationDateTime.create(h.previousDateTime)
          : null,
        newDateTime: h.newDateTime
          ? ReservationDateTime.create(h.newDateTime)
          : null,
        previousSlotId: h.previousSlotId
          ? SlotId.create(h.previousSlotId)
          : null,
        newSlotId: h.newSlotId ? SlotId.create(h.newSlotId) : null,
        changedBy: h.changedBy as ActorType,
        changedAt: h.changedAt,
      }),
    );

    return Reservation.reconstruct({
      reservationId: ReservationId.create(record.id),
      ownerId: OwnerId.create(record.ownerId),
      customerId: CustomerId.create(record.customerId),
      slotId: SlotId.create(record.slotId),
      dateTime: ReservationDateTime.create(record.dateTime),
      durationMinutes: DurationMinutes.create(record.durationMinutes),
      status: record.status as ReservationStatus,
      customerName: CustomerName.create(record.customerName),
      lineUserId: LineUserId.create(record.lineUserId),
      ownerLineUserId: LineUserId.create(record.ownerLineUserId),
      createdBy: record.createdBy as ActorType,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      histories: domainHistories,
    });
  }
}
