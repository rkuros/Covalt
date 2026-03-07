import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordResetTokenRepository } from '../domain/PasswordResetTokenRepository';
import { PasswordResetToken } from '../domain/PasswordResetToken';
import { AuthToken } from '../domain/AuthToken';

@Injectable()
export class PrismaPasswordResetTokenRepository
  implements PasswordResetTokenRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(token: PasswordResetToken): Promise<void> {
    await this.prisma.passwordResetToken.upsert({
      where: { id: token.tokenId },
      create: {
        id: token.tokenId,
        ownerId: token.ownerId,
        token: token.token.value,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
      },
      update: {
        token: token.token.value,
        expiresAt: token.expiresAt,
        usedAt: token.usedAt,
      },
    });
  }

  async findByToken(token: AuthToken): Promise<PasswordResetToken | null> {
    const row = await this.prisma.passwordResetToken.findUnique({
      where: { token: token.value },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByOwnerId(ownerId: string): Promise<PasswordResetToken[]> {
    const rows = await this.prisma.passwordResetToken.findMany({
      where: { ownerId },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    token: string;
    expiresAt: Date;
    usedAt: Date | null;
  }): PasswordResetToken {
    return PasswordResetToken.reconstruct(
      row.id,
      row.ownerId,
      AuthToken.create(row.token),
      row.expiresAt,
      row.usedAt,
    );
  }
}
