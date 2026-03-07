import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventPublisher } from '../domain/EventPublisher';
import { LineFriendAddedEvent } from '../domain/LineFriendAddedEvent';

/**
 * ドメインイベント発行の EventEmitter2 実装。
 * EventEmitter2 経由でイベントを発行し、同一プロセス内のリスナーに配信する。
 */
@Injectable()
export class LineEventPublisher implements EventPublisher {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publishFriendAdded(event: LineFriendAddedEvent): Promise<void> {
    console.log('[EventPublisher] publishing line.friend_added', event.toPayload());
    this.eventEmitter.emit('line.friend_added', event.toPayload());
  }
}
