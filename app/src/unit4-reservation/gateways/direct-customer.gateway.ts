import { Injectable } from '@nestjs/common';
import {
  CustomerGateway,
  CustomerInfo,
  CustomerSearchResult,
} from '../domain/CustomerGateway';
import { CustomerId } from '../domain/CustomerId';
import { OwnerId } from '../domain/OwnerId';
import { LineUserId } from '../domain/LineUserId';
import { CustomerQueryService } from '../../unit6-customer/domain/CustomerQueryService';
import { CustomerCommandService } from '../../unit6-customer/domain/CustomerCommandService';

@Injectable()
export class DirectCustomerGateway implements CustomerGateway {
  constructor(
    private readonly queryService: CustomerQueryService,
    private readonly commandService: CustomerCommandService,
  ) {}

  async findById(customerId: CustomerId): Promise<CustomerInfo | null> {
    const result = await this.queryService.findById(customerId.value);
    if (!result) return null;
    return result as unknown as CustomerInfo;
  }

  async findByLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
  ): Promise<CustomerInfo | null> {
    const result = await this.queryService.findByLineUserId(
      ownerId.value,
      lineUserId.value,
    );
    if (!result) return null;
    return result as unknown as CustomerInfo;
  }

  async searchByName(
    ownerId: OwnerId,
    query: string,
  ): Promise<CustomerSearchResult> {
    return this.queryService.searchByName(ownerId.value, query);
  }

  async create(ownerId: OwnerId, customerName: string): Promise<CustomerInfo> {
    const result = await this.commandService.createManual({
      ownerId: ownerId.value,
      customerName,
    });
    return result as unknown as CustomerInfo;
  }

  async findOrCreateByLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
    displayName: string,
  ): Promise<CustomerInfo> {
    const existing = await this.queryService.findByLineUserId(
      ownerId.value,
      lineUserId.value,
    );
    if (existing) return existing as unknown as CustomerInfo;

    const result = await this.commandService.createFromLineFollow({
      ownerId: ownerId.value,
      lineUserId: lineUserId.value,
      displayName,
    });
    return result as unknown as CustomerInfo;
  }
}
