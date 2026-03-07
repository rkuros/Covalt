import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalendarEventMapping } from '../domain/CalendarEventMapping';
import { CalendarEventMappingRepository } from '../domain/CalendarEventMappingRepository';

@Injectable()
export class PrismaCalendarEventMappingRepository implements CalendarEventMappingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CalendarEventMapping | null> {
    const row = await this.prisma.calendarEventMapping.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByReservationId(reservationId: string): Promise<CalendarEventMapping | null> {
    const rows = await this.prisma.calendarEventMapping.findMany({
      where: {
        reservationId,
        isActive: true,
      },
      take: 1,
    });
    if (rows.length === 0) return null;
    return this.toDomain(rows[0]);
  }

  async save(mapping: CalendarEventMapping): Promise<void> {
    await this.prisma.calendarEventMapping.upsert({
      where: { id: mapping.id },
      create: {
        id: mapping.id,
        ownerId: mapping.ownerId,
        reservationId: mapping.reservationId,
        googleEventId: mapping.googleEventId,
        isActive: mapping.active,
      },
      update: {
        googleEventId: mapping.googleEventId,
        isActive: mapping.active,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.calendarEventMapping.delete({
      where: { id },
    });
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    reservationId: string;
    googleEventId: string;
    isActive: boolean;
  }): CalendarEventMapping {
    return CalendarEventMapping.reconstruct(
      row.id,
      row.reservationId,
      row.ownerId,
      row.googleEventId,
      '',
      row.isActive,
      new Date(),
      new Date(),
    );
  }
}
