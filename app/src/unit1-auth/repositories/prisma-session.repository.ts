import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SessionRepository } from '../domain/SessionRepository';
import { Session } from '../domain/Session';
import { AuthToken } from '../domain/AuthToken';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(session: Session): Promise<void> {
    await this.prisma.session.upsert({
      where: { id: session.sessionId },
      create: {
        id: session.sessionId,
        ownerId: session.ownerId,
        token: session.token.value,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
      update: {
        token: session.token.value,
        expiresAt: session.expiresAt,
      },
    });
  }

  async findByToken(token: AuthToken): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({
      where: { token: token.value },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByOwnerId(ownerId: string): Promise<Session[]> {
    const rows = await this.prisma.session.findMany({
      where: { ownerId },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async deleteByToken(token: AuthToken): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { token: token.value },
    });
  }

  async deleteByOwnerId(ownerId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { ownerId },
    });
  }

  private toDomain(row: {
    id: string;
    ownerId: string;
    token: string;
    createdAt: Date;
    expiresAt: Date;
  }): Session {
    return Session.reconstruct(
      row.id,
      row.ownerId,
      AuthToken.create(row.token),
      row.createdAt,
      row.expiresAt,
    );
  }
}
