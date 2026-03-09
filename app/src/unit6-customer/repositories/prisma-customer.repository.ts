import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { CustomerRepository } from '../domain/CustomerRepository';
import { Customer } from '../domain/Customer';
import { CustomerId } from '../domain/CustomerId';
import { OwnerId } from '../domain/OwnerId';
import { LineUserId } from '../domain/LineUserId';
import { CustomerName } from '../domain/CustomerName';
import { DisplayName } from '../domain/DisplayName';

@Injectable()
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findById(customerId: CustomerId): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: { id: customerId.value },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async findByOwnerAndLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
  ): Promise<Customer | null> {
    const record = await this.prisma.customer.findUnique({
      where: {
        ownerId_lineUserId: {
          ownerId: ownerId.value,
          lineUserId: lineUserId.value,
        },
      },
    });
    if (!record) return null;
    return this.toDomain(record);
  }

  async searchByName(ownerId: OwnerId, query: string): Promise<Customer[]> {
    // customerName は暗号化されているため、全件取得後にインメモリで検索
    const records = await this.prisma.customer.findMany({
      where: { ownerId: ownerId.value },
      orderBy: { registeredAt: 'desc' },
    });

    const lowerQuery = query.toLowerCase();
    return records
      .map((record) => this.toDomain(record))
      .filter((c) => c.customerName.value.toLowerCase().includes(lowerQuery));
  }

  async save(customer: Customer): Promise<void> {
    await this.prisma.customer.upsert({
      where: { id: customer.customerId.value },
      create: {
        id: customer.customerId.value,
        ownerId: customer.ownerId.value,
        customerName: this.encryption.encrypt(customer.customerName.value),
        displayName: this.encryption.encryptNullable(
          customer.displayName?.value ?? null,
        ),
        lineUserId: customer.lineUserId?.value ?? null,
        isLineLinked: customer.isLineLinked,
        registeredAt: customer.registeredAt,
      },
      update: {
        customerName: this.encryption.encrypt(customer.customerName.value),
        displayName: this.encryption.encryptNullable(
          customer.displayName?.value ?? null,
        ),
        lineUserId: customer.lineUserId?.value ?? null,
        isLineLinked: customer.isLineLinked,
      },
    });
  }

  private toDomain(record: {
    id: string;
    ownerId: string;
    customerName: string;
    displayName: string | null;
    lineUserId: string | null;
    isLineLinked: boolean;
    registeredAt: Date;
    birthDate: string | null;
    gender: string | null;
  }): Customer {
    return Customer.reconstruct({
      customerId: CustomerId.create(record.id),
      ownerId: OwnerId.create(record.ownerId),
      customerName: CustomerName.create(
        this.encryption.decrypt(record.customerName),
      ),
      displayName: record.displayName
        ? DisplayName.create(this.encryption.decrypt(record.displayName))
        : null,
      lineUserId: record.lineUserId
        ? LineUserId.create(record.lineUserId)
        : null,
      isLineLinked: record.isLineLinked,
      registeredAt: record.registeredAt,
      birthDate: record.birthDate,
      gender: record.gender,
    });
  }
}
