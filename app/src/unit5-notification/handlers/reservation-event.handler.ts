import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ReservationEventHandler as DomainHandler } from '../domain/ReservationEventHandler';
import {
  ReservationEvent,
  parseReservationEvent,
} from '../domain/ReservationEvent';

/**
 * NestJS EventEmitter2 の @OnEvent デコレータを使って
 * reservation.* イベントをリッスンし、ドメインの ReservationEventHandler に委譲する。
 */
@Injectable()
export class ReservationEventNestHandler {
  private readonly logger = new Logger(ReservationEventNestHandler.name);

  constructor(private readonly domainHandler: DomainHandler) {}

  @OnEvent('reservation.created')
  async handleCreated(payload: unknown): Promise<void> {
    this.logger.log('[Unit5] reservation.created event received', payload);
    try {
      const event: ReservationEvent = parseReservationEvent(payload);
      await this.domainHandler.handle(event);
    } catch (error) {
      this.logger.error('[Unit5] reservation.created handling failed', error);
    }
  }

  @OnEvent('reservation.modified')
  async handleModified(payload: unknown): Promise<void> {
    this.logger.log('[Unit5] reservation.modified event received', payload);
    try {
      const event: ReservationEvent = parseReservationEvent(payload);
      await this.domainHandler.handle(event);
    } catch (error) {
      this.logger.error('[Unit5] reservation.modified handling failed', error);
    }
  }

  @OnEvent('reservation.cancelled')
  async handleCancelled(payload: unknown): Promise<void> {
    this.logger.log('[Unit5] reservation.cancelled event received', payload);
    try {
      const event: ReservationEvent = parseReservationEvent(payload);
      await this.domainHandler.handle(event);
    } catch (error) {
      this.logger.error('[Unit5] reservation.cancelled handling failed', error);
    }
  }
}
