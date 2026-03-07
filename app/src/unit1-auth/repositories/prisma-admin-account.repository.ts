import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AdminAccountRepository } from '../domain/AdminAccountRepository';
import { AdminAccount } from '../domain/AdminAccount';
import { EmailAddress } from '../domain/EmailAddress';
import { HashedPassword } from '../domain/HashedPassword';

@Injectable()
export class PrismaAdminAccountRepository implements AdminAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(account: AdminAccount): Promise<void> {
    await this.prisma.adminAccount.upsert({
      where: { id: account.adminId },
      create: {
        id: account.adminId,
        email: account.email.value,
        passwordHash: account.passwordHash.value,
        role: account.role.value,
        createdAt: account.createdAt,
      },
      update: {
        email: account.email.value,
        passwordHash: account.passwordHash.value,
      },
    });
  }

  async findById(adminId: string): Promise<AdminAccount | null> {
    const row = await this.prisma.adminAccount.findUnique({
      where: { id: adminId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByEmail(email: EmailAddress): Promise<AdminAccount | null> {
    const row = await this.prisma.adminAccount.findUnique({
      where: { email: email.value },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
  }): AdminAccount {
    return AdminAccount.reconstruct(
      row.id,
      EmailAddress.create(row.email),
      HashedPassword.fromHash(row.passwordHash),
      row.createdAt,
    );
  }
}
