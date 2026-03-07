import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CustomerAutoRegistrationHandler } from '../domain/CustomerAutoRegistrationHandler';
import type { LineFriendAddedEvent } from '../domain/CustomerAutoRegistrationHandler';

/**
 * NestJS イベントハンドラ: line.friend_added
 *
 * @nestjs/event-emitter の @OnEvent デコレータで line.friend_added イベントを購読し、
 * ドメインの CustomerAutoRegistrationHandler に処理を委譲する。
 */
@Injectable()
export class LineFriendAddedNestHandler {
  constructor(
    private readonly autoRegistrationHandler: CustomerAutoRegistrationHandler,
  ) {}

  @OnEvent('line.friend_added')
  async handleLineFriendAdded(event: LineFriendAddedEvent): Promise<void> {
    await this.autoRegistrationHandler.handle(event);
  }
}
