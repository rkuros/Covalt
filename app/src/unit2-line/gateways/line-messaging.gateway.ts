import { Injectable } from '@nestjs/common';
import {
  LineMessagingGateway,
  LineUserProfile,
} from '../domain/LineMessagingGateway';
import { PushMessage } from '../domain/PushMessage';
import { UserBlockedError } from '../domain/DomainErrors';

/**
 * LINE Messaging API Gateway 実装。
 * Push Message API / Get Profile API を呼び出す。
 */
@Injectable()
export class LineMessagingGatewayImpl implements LineMessagingGateway {
  async pushMessage(
    channelAccessToken: string,
    lineUserId: string,
    messages: PushMessage[],
  ): Promise<string> {
    const body = {
      to: lineUserId,
      messages: messages.map((m) =>
        m.type === 'text'
          ? { type: 'text', text: m.text }
          : { type: 'text', text: m.altText ?? m.text },
      ),
    };

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorObj = errorBody as { message?: string; details?: any[] };

      if (errorObj.message?.includes('block')) {
        throw new UserBlockedError();
      }

      console.error('[LINE Messaging API] pushMessage failed', {
        status: response.status,
        error: errorObj,
      });

      throw new Error(
        `LINE push message failed: ${response.status} ${errorObj.message ?? ''}`,
      );
    }

    const result = (await response.json().catch(() => ({}))) as {
      sentMessages?: Array<{ id: string }>;
    };
    return result.sentMessages?.[0]?.id ?? `msg_${Date.now()}`;
  }

  async getProfile(
    channelAccessToken: string,
    lineUserId: string,
  ): Promise<LineUserProfile> {
    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${lineUserId}`,
      {
        headers: {
          Authorization: `Bearer ${channelAccessToken}`,
        },
      },
    );

    if (!response.ok) {
      console.error('[LINE Messaging API] getProfile failed', {
        status: response.status,
        lineUserId,
      });
      throw new Error(`LINE getProfile failed: ${response.status}`);
    }

    const profile = (await response.json()) as {
      userId: string;
      displayName: string;
    };

    return {
      lineUserId: profile.userId,
      displayName: profile.displayName,
    };
  }
}
