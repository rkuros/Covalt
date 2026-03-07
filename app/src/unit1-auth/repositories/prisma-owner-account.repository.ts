import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OwnerAccountRepository } from '../domain/OwnerAccountRepository';
import { OwnerAccount } from '../domain/OwnerAccount';
import { EmailAddress } from '../domain/EmailAddress';
import { HashedPassword } from '../domain/HashedPassword';
import { AccountStatus } from '../domain/AccountStatus';

@Injectable()
export class PrismaOwnerAccountRepository implements OwnerAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(account: OwnerAccount): Promise<void> {
    await this.prisma.ownerAccount.upsert({
      where: { id: account.ownerId },
      create: {
        id: account.ownerId,
        email: account.email.value,
        passwordHash: account.passwordHash.value,
        role: account.role.value,
        status: account.status.value,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      update: {
        email: account.email.value,
        passwordHash: account.passwordHash.value,
        status: account.status.value,
        updatedAt: account.updatedAt,
      },
    });
  }

  async findById(ownerId: string): Promise<OwnerAccount | null> {
    const row = await this.prisma.ownerAccount.findUnique({
      where: { id: ownerId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEmail(email: EmailAddress): Promise<OwnerAccount | null> {
    const row = await this.prisma.ownerAccount.findUnique({
      where: { email: email.value },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findAll(): Promise<OwnerAccount[]> {
    const rows = await this.prisma.ownerAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: string;
    email: string;
    passwordHash: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): OwnerAccount {
    return OwnerAccount.reconstruct(
      row.id,
      EmailAddress.create(row.email),
      HashedPassword.fromHash(row.passwordHash),
      AccountStatus.create(row.status),
      row.createdAt,
      row.updatedAt,
    );
  }
}
