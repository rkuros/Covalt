import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SlotGateway,
  SlotListResult,
  SlotReserveResult,
  SlotReleaseResult,
} from '../domain/SlotGateway';
import { OwnerId } from '../domain/OwnerId';
import { SlotId } from '../domain/SlotId';
import { ReservationId } from '../domain/ReservationId';

@Injectable()
export class HttpSlotGateway implements SlotGateway {
  private readonly logger = new Logger(HttpSlotGateway.name);
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

  async findAvailableSlots(
    ownerId: OwnerId,
    date: string,
  ): Promise<SlotListResult> {
    const url = `${this.baseUrl}/api/slots/available?ownerId=${encodeURIComponent(ownerId.value)}&date=${encodeURIComponent(date)}`;
    this.logger.debug(`GET ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': this.internalKey,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SlotGateway.findAvailableSlots failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as SlotListResult;
  }

  async reserveSlot(
    slotId: SlotId,
    reservationId: ReservationId,
  ): Promise<SlotReserveResult> {
    const url = `${this.baseUrl}/api/slots/${slotId.value}/reserve`;
    this.logger.debug(`PUT ${url}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': this.internalKey },
      body: JSON.stringify({ reservationId: reservationId.value }),
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 409) {
        throw new Error(`SLOT_ALREADY_BOOKED: ${body}`);
      }
      throw new Error(
        `SlotGateway.reserveSlot failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as SlotReserveResult;
  }

  async releaseSlot(
    slotId: SlotId,
    reservationId: ReservationId,
  ): Promise<SlotReleaseResult> {
    const url = `${this.baseUrl}/api/slots/${slotId.value}/release`;
    this.logger.debug(`PUT ${url}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Key': this.internalKey },
      body: JSON.stringify({ reservationId: reservationId.value }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `SlotGateway.releaseSlot failed: ${response.status} ${body}`,
      );
    }

    return (await response.json()) as SlotReleaseResult;
  }
}
