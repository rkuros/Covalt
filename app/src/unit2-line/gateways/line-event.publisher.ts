import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventPublisher } from '../domain/EventPublisher';
import { LineFriendAddedEvent } from '../domain/LineFriendAddedEvent';

/**
 * ドメインイベント発行の EventEmitter2 実装。
 * EventEmitter2 経由でイベントを発行し、同一プロセス内のリスナーに配信する。
 */
@Injectable()
export class LineEventPublisher implements EventPublisher {
  private readonly logger = new Logger(LineEventPublisher.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publishFriendAdded(event: LineFriendAddedEvent): Promise<void> {
    this.logger.log(
      '[EventPublisher] publishing line.friend_added',
      event.toPayload(),
    );
    await this.eventEmitter.emitAsync('line.friend_added', event.toPayload());
  }
}
