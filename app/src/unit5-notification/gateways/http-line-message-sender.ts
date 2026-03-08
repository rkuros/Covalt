import { Injectable } from '@nestjs/common';
import { LineMessage, LineMessageSender } from '../domain/LineMessageSender';
import { SendResult, SendErrorType } from '../domain/SendResult';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * LINE Messaging API を直接呼び出す LineMessageSender 実装。
 * DB から channelAccessToken を取得し、LINE Push Message API を呼ぶ。
 */
@Injectable()
export class HttpLineMessageSender implements LineMessageSender {
  constructor(private readonly prisma: PrismaService) {}

  async send(
    ownerId: string,
    lineUserId: string,
    messages: readonly LineMessage[],
  ): Promise<SendResult> {
    try {
      const config = await this.prisma.lineChannelConfig.findUnique({
        where: { ownerId },
      });

      if (!config) {
        return SendResult.fail(
          SendErrorType.Unknown,
          `LINE channel config not found for ownerId=${ownerId}`,
        );
      }

      const body = {
        to: lineUserId,
        messages: messages.map((m) => ({
          type: 'text' as const,
          text: m.text,
        })),
      };

      const response = await fetch(
        'https://api.line.me/v2/bot/message/push',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.channelAccessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorObj = errorBody as { message?: string };

        if (response.status === 400 && errorObj.message?.includes('block')) {
          return SendResult.fail(
            SendErrorType.UserBlocked,
            errorObj.message ?? 'User blocked',
          );
        }

        return SendResult.fail(
          SendErrorType.Unknown,
          `LINE API ${response.status}: ${errorObj.message ?? 'Unknown error'}`,
        );
      }

      const result = (await response.json().catch(() => ({}))) as {
        sentMessages?: Array<{ id: string }>;
      };
      return SendResult.ok(result.sentMessages?.[0]?.id ?? `msg_${Date.now()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return SendResult.fail(SendErrorType.NetworkError, message);
    }
  }
}
