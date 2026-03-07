import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventPublisher } from '../domain/EventPublisher';
import { ReservationDomainEvent } from '../domain/DomainEvent';

@Injectable()
export class NestjsEventPublisher implements EventPublisher {
  private readonly logger = new Logger(NestjsEventPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: ReservationDomainEvent): Promise<void> {
    this.logger.log(
      `Publishing event: ${event.eventType} (reservationId: ${event.reservationId})`,
    );
    this.eventEmitter.emit(event.eventType, event);
  }
}
