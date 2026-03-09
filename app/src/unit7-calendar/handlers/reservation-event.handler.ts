import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReservationEventHandler as DomainHandler } from '../domain/ReservationEventHandler';
import { ReservationEvent } from '../domain/ReservationEvent';

/**
 * NestJS EventEmitter2 の @OnEvent デコレータを使って
 * reservation.* イベントをリッスンし、ドメインの ReservationEventHandler に委譲して
 * Google カレンダー同期を実行する。
 */
@Injectable()
export class CalendarReservationEventHandler {
  private readonly logger = new Logger(CalendarReservationEventHandler.name);

  constructor(private readonly domainHandler: DomainHandler) {}

  @OnEvent('reservation.created')
  async handleCreated(payload: unknown): Promise<void> {
    this.logger.log(
      '[Unit7] reservation.created event received for calendar sync',
      payload,
    );
    try {
      const event = this.parseEvent(payload);
      if (event) {
        await this.domainHandler.handle(event);
      }
    } catch (error) {
      this.logger.error(
        '[Unit7] Calendar sync failed for reservation.created',
        error,
      );
    }
  }

  @OnEvent('reservation.modified')
  async handleModified(payload: unknown): Promise<void> {
    this.logger.log(
      '[Unit7] reservation.modified event received for calendar sync',
      payload,
    );
    try {
      const event = this.parseEvent(payload);
      if (event) {
        await this.domainHandler.handle(event);
      }
    } catch (error) {
      this.logger.error(
        '[Unit7] Calendar sync failed for reservation.modified',
        error,
      );
    }
  }

  @OnEvent('reservation.cancelled')
  async handleCancelled(payload: unknown): Promise<void> {
    this.logger.log(
      '[Unit7] reservation.cancelled event received for calendar sync',
      payload,
    );
    try {
      const event = this.parseEvent(payload);
      if (event) {
        await this.domainHandler.handle(event);
      }
    } catch (error) {
      this.logger.error(
        '[Unit7] Calendar sync failed for reservation.cancelled',
        error,
      );
    }
  }

  private parseEvent(payload: unknown): ReservationEvent | null {
    if (typeof payload !== 'object' || payload === null) {
      this.logger.error('[Unit7] Invalid event payload: not an object');
      return null;
    }

    const obj = payload as Record<string, unknown>;
    const requiredFields = [
      'eventType',
      'reservationId',
      'ownerId',
      'customerName',
      'slotId',
      'dateTime',
      'timestamp',
    ];
    for (const field of requiredFields) {
      if (typeof obj[field] !== 'string') {
        this.logger.error(`[Unit7] Missing required field: ${field}`);
        return null;
      }
    }

    // Unit7 の ReservationEvent は durationMinutes を必要とする
    const durationMinutes =
      typeof obj['durationMinutes'] === 'number' ? obj['durationMinutes'] : 60;

    const base = {
      reservationId: obj['reservationId'] as string,
      ownerId: obj['ownerId'] as string,
      customerName: obj['customerName'] as string,
      slotId: obj['slotId'] as string,
      dateTime: obj['dateTime'] as string,
      timestamp: obj['timestamp'] as string,
      durationMinutes,
    };

    switch (obj['eventType']) {
      case 'reservation.created':
        return {
          ...base,
          eventType: 'reservation.created',
        } as ReservationEvent;

      case 'reservation.modified':
        return {
          ...base,
          eventType: 'reservation.modified',
          previousDateTime: (obj['previousDateTime'] as string) ?? '',
        } as ReservationEvent;

      case 'reservation.cancelled':
        return {
          ...base,
          eventType: 'reservation.cancelled',
        } as ReservationEvent;

      default:
        this.logger.error(
          `[Unit7] Unknown event type: ${String(obj['eventType'])}`,
        );
        return null;
    }
  }
}
