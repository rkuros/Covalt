import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { LineFriendship, FriendshipStatus } from '../domain/LineFriendship';
import { LineFriendshipRepository } from '../domain/LineFriendshipRepository';
import { LineUserId } from '../domain/LineUserId';

@Injectable()
export class PrismaLineFriendshipRepository implements LineFriendshipRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findById(id: string): Promise<LineFriendship | null> {
    const row = await this.prisma.lineFriendship.findUnique({
      where: { id },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByOwnerIdAndLineUserId(
    ownerId: string,
    lineUserId: LineUserId,
  ): Promise<LineFriendship | null> {
    const row = await this.prisma.lineFriendship.findUnique({
      where: {
        ownerId_lineUserId: {
          ownerId,
          lineUserId: lineUserId.value,
        },
      },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findAllByOwnerId(ownerId: string): Promise<LineFriendship[]> {
    const rows = await this.prisma.lineFriendship.findMany({
      where: { ownerId },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async save(friendship: LineFriendship): Promise<void> {
    await this.prisma.lineFriendship.upsert({
      where: { id: friendship.id },
      create: {
        id: friendship.id,
        ownerId: friendship.ownerId,
        lineUserId: friendship.lineUserId.value,
        displayName: this.encryption.encryptNullable(friendship.displayName),
        status: friendship.status,
        followedAt: friendship.followedAt,
        unfollowedAt: friendship.unfollowedAt,
      },
      update: {
        displayName: this.encryption.encryptNullable(friendship.displayName),
        status: friendship.status,
        unfollowedAt: friendship.unfollowedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lineFriendship.delete({
      where: { id },
    });
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    lineUserId: string;
    displayName: string | null;
    status: string;
    followedAt: Date;
    unfollowedAt: Date | null;
  }): LineFriendship {
    return LineFriendship.reconstruct({
      id: row.id,
      ownerId: row.ownerId,
      lineUserId: LineUserId.create(row.lineUserId),
      displayName: this.encryption.decryptNullable(row.displayName) ?? '',
      status: row.status as FriendshipStatus,
      followedAt: row.followedAt,
      unfollowedAt: row.unfollowedAt,
    });
  }
}
