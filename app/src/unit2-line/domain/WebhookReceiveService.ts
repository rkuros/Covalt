import { createHmac, timingSafeEqual } from "crypto";
import { WebhookEvent, WebhookEventType } from "./WebhookEvent";
import { LineChannelConfigRepository } from "./LineChannelConfigRepository";
import {
  ChannelConfigNotFoundError,
  WebhookSignatureVerificationError,
  DuplicateWebhookEventError,
} from "./DomainErrors";

/**
 * LINE Platform からの Webhook リクエストを受信し、署名検証を行い、
 * イベント種別ごとにディスパッチするドメインサービス。
 */
export type WebhookEventHandler = (ownerId: string, event: WebhookEvent) => Promise<void>;

export class WebhookReceiveService {
  private readonly handlers = new Map<WebhookEventType, WebhookEventHandler>();
  private readonly processedEventIds = new Set<string>();

  constructor(
    private readonly channelConfigRepository: LineChannelConfigRepository,
  ) {}

  registerHandler(
    eventType: WebhookEventType,
    handler: WebhookEventHandler,
  ): void {
    this.handlers.set(eventType, handler);
  }

  /**
   * Webhook 署名を検証する。
   * x-line-signature ヘッダの HMAC-SHA256 署名を channelSecret で検証する。
   */
  verifySignature(
    body: string,
    signature: string,
    channelSecret: string,
  ): boolean {
    const hash = createHmac("SHA256", channelSecret)
      .update(body)
      .digest("base64");
    const hashBuf = Buffer.from(hash);
    const sigBuf = Buffer.from(signature);
    if (hashBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(hashBuf, sigBuf);
  }

  /**
   * Webhook リクエストを受信し、署名検証後にイベントをディスパッチする。
   */
  async receive(
    ownerId: string,
    body: string,
    signature: string,
    events: WebhookEvent[],
  ): Promise<void> {
    // チャネル設定を取得
    const config = await this.channelConfigRepository.findByOwnerId(ownerId);
    if (!config) {
      throw new ChannelConfigNotFoundError(ownerId);
    }

    // 署名検証
    if (!this.verifySignature(body, signature, config.channelSecret)) {
      throw new WebhookSignatureVerificationError();
    }

    // イベントごとにディスパッチ
    for (const event of events) {
      // 冪等性: 重複イベントの排除
      if (event.webhookEventId) {
        if (this.processedEventIds.has(event.webhookEventId)) {
          console.log(
            `Duplicate webhook event skipped: ${event.webhookEventId}`,
          );
          continue;
        }
        this.processedEventIds.add(event.webhookEventId);
      }

      const handler = this.handlers.get(event.eventType);
      if (handler) {
        await handler(ownerId, event);
      } else {
        console.log(`No handler registered for event type: ${event.eventType}`);
      }
    }
  }
}
