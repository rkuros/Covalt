import { Injectable } from '@nestjs/common';
import {
  LineMessagingGateway,
  LineUserProfile,
} from '../domain/LineMessagingGateway';
import { PushMessage } from '../domain/PushMessage';

/**
 * LINE Messaging API Gateway の仮実装。
 * 本番では LINE Messaging API を呼び出す。現時点では console.log で代替する。
 */
@Injectable()
export class LineMessagingGatewayImpl implements LineMessagingGateway {
  async pushMessage(
    channelAccessToken: string,
    lineUserId: string,
    messages: PushMessage[],
  ): Promise<string> {
    const messageId = `msg_${Date.now()}`;
    console.log('[LINE Messaging API] pushMessage called', {
      channelAccessToken: channelAccessToken.substring(0, 8) + '...',
      lineUserId,
      messageCount: messages.length,
      messageId,
    });
    return messageId;
  }

  async getProfile(
    channelAccessToken: string,
    lineUserId: string,
  ): Promise<LineUserProfile> {
    console.log('[LINE Messaging API] getProfile called', {
      channelAccessToken: channelAccessToken.substring(0, 8) + '...',
      lineUserId,
    });
    return {
      lineUserId,
      displayName: `User_${lineUserId.substring(0, 8)}`,
    };
  }
}
