import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LineChannelConfig } from '../domain/LineChannelConfig';
import { LineChannelConfigRepository } from '../domain/LineChannelConfigRepository';

@Injectable()
export class PrismaLineChannelConfigRepository implements LineChannelConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<LineChannelConfig | null> {
    const row = await this.prisma.lineChannelConfig.findUnique({
      where: { ownerId: id },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByOwnerId(ownerId: string): Promise<LineChannelConfig | null> {
    const row = await this.prisma.lineChannelConfig.findUnique({
      where: { ownerId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async save(config: LineChannelConfig): Promise<void> {
    await this.prisma.lineChannelConfig.upsert({
      where: { ownerId: config.ownerId },
      create: {
        ownerId: config.ownerId,
        channelAccessToken: config.channelAccessToken,
        channelSecret: config.channelSecret,
        liffId: config.liffId,
        webhookUrl: config.webhookUrl,
        isActive: config.isActive,
      },
      update: {
        channelAccessToken: config.channelAccessToken,
        channelSecret: config.channelSecret,
        liffId: config.liffId,
        webhookUrl: config.webhookUrl,
        isActive: config.isActive,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lineChannelConfig.delete({
      where: { ownerId: id },
    });
  }

  private toDomain(row: {
    ownerId: string;
    channelAccessToken: string;
    channelSecret: string;
    liffId: string;
    webhookUrl: string | null;
    isActive: boolean;
  }): LineChannelConfig {
    return LineChannelConfig.reconstruct({
      id: row.ownerId,
      ownerId: row.ownerId,
      channelAccessToken: row.channelAccessToken,
      channelSecret: row.channelSecret,
      liffId: row.liffId,
      webhookUrl: row.webhookUrl ?? '',
      isActive: row.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
