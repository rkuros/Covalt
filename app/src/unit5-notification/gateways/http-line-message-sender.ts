import { Injectable } from '@nestjs/common';
import { LineMessage, LineMessageSender } from '../domain/LineMessageSender';
import { SendResult, SendErrorType } from '../domain/SendResult';

/**
 * Unit 2 の POST /api/line/messages/push を HTTP で呼び出す LineMessageSender 実装。
 * fetch API を使用して Unit 2 のエンドポイントにリクエストを送る。
 */
@Injectable()
export class HttpLineMessageSender implements LineMessageSender {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env['LINE_API_BASE_URL'] ?? 'http://localhost:3000';
  }

  async send(
    ownerId: string,
    lineUserId: string,
    messages: readonly LineMessage[],
  ): Promise<SendResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/line/messages/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          lineUserId,
          messages: messages.map((m) => ({
            type: m.type,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const errorObj = errorBody as { error?: string; message?: string };

        if (errorObj.error === 'USER_BLOCKED') {
          return SendResult.fail(
            SendErrorType.UserBlocked,
            errorObj.message ?? 'User blocked',
          );
        }

        return SendResult.fail(
          SendErrorType.Unknown,
          `HTTP ${response.status}: ${errorObj.message ?? 'Unknown error'}`,
        );
      }

      const result = (await response.json()) as { messageId?: string };
      return SendResult.ok(result.messageId ?? '');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return SendResult.fail(SendErrorType.NetworkError, message);
    }
  }
}
