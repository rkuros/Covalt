import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SlotTemplateRepository } from '../domain/SlotTemplateRepository';
import { SlotTemplate } from '../domain/SlotTemplate';
import { SlotTemplateId } from '../domain/SlotTemplateId';
import { OwnerId } from '../domain/OwnerId';
import { TimeOfDay } from '../domain/TimeOfDay';

@Injectable()
export class PrismaSlotTemplateRepository implements SlotTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByOwnerId(ownerId: OwnerId): Promise<SlotTemplate[]> {
    const rows = await this.prisma.slotTemplate.findMany({
      where: { ownerId: ownerId.value },
      include: { entries: true },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(templateId: SlotTemplateId): Promise<SlotTemplate | null> {
    const row = await this.prisma.slotTemplate.findUnique({
      where: { id: templateId.value },
      include: { entries: true },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async save(template: SlotTemplate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.slotTemplate.findUnique({
        where: { id: template.templateId.value },
      });

      if (existing) {
        await tx.slotTemplateEntry.deleteMany({
          where: { templateId: existing.id },
        });
        await tx.slotTemplate.update({
          where: { id: existing.id },
          data: {
            name: template.name,
            entries: {
              create: template.entries.map((e) => ({
                startTime: e.startTime.toString(),
                endTime: e.endTime.toString(),
              })),
            },
          },
        });
      } else {
        await tx.slotTemplate.create({
          data: {
            id: template.templateId.value,
            ownerId: template.ownerId.value,
            name: template.name,
            entries: {
              create: template.entries.map((e) => ({
                startTime: e.startTime.toString(),
                endTime: e.endTime.toString(),
              })),
            },
          },
        });
      }
    });
  }

  async delete(templateId: SlotTemplateId): Promise<void> {
    await this.prisma.slotTemplate.delete({
      where: { id: templateId.value },
    });
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    name: string;
    entries: { startTime: string; endTime: string }[];
  }): SlotTemplate {
    return SlotTemplate.create({
      templateId: SlotTemplateId.create(row.id),
      ownerId: OwnerId.create(row.ownerId),
      name: row.name,
      entries: row.entries.map((e) => ({
        startTime: TimeOfDay.fromString(e.startTime),
        endTime: TimeOfDay.fromString(e.endTime),
      })),
    });
  }
}
