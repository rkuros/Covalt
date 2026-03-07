import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CustomerGateway,
  CustomerInfo,
  CustomerSearchResult,
} from '../domain/CustomerGateway';
import { CustomerId } from '../domain/CustomerId';
import { OwnerId } from '../domain/OwnerId';
import { LineUserId } from '../domain/LineUserId';

@Injectable()
export class HttpCustomerGateway implements CustomerGateway {
  private readonly logger = new Logger(HttpCustomerGateway.name);
  private readonly baseUrl: string;
  private readonly internalKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'INTERNAL_API_BASE_URL',
      'http://localhost:3000',
    );
    this.internalKey = this.configService.get<string>(
      'INTERNAL_SERVICE_KEY',
      'covalt-internal',
    );
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      'X-Internal-Key': this.internalKey,
    };
  }

  async findById(customerId: CustomerId): Promise<CustomerInfo | null> {
    const url = `${this.baseUrl}/api/customers/${customerId.value}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `CustomerGateway.findById failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as CustomerInfo;
  }

  async findByLineUserId(
    ownerId: OwnerId,
    lineUserId: LineUserId,
  ): Promise<CustomerInfo | null> {
    const url = `${this.baseUrl}/api/customers/by-line-user?ownerId=${encodeURIComponent(ownerId.value)}&lineUserId=${encodeURIComponent(lineUserId.value)}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `CustomerGateway.findByLineUserId failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as CustomerInfo;
  }

  async searchByName(
    ownerId: OwnerId,
    query: string,
  ): Promise<CustomerSearchResult> {
    const url = `${this.baseUrl}/api/customers/search?ownerId=${encodeURIComponent(ownerId.value)}&q=${encodeURIComponent(query)}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `CustomerGateway.searchByName failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as CustomerSearchResult;
  }

  async create(
    ownerId: OwnerId,
    customerName: string,
  ): Promise<CustomerInfo> {
    const url = `${this.baseUrl}/api/customers`;
    this.logger.debug(`POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        ownerId: ownerId.value,
        customerName,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `CustomerGateway.create failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as CustomerInfo;
  }
}
