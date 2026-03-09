/**
 * LINE Platform から受信した Webhook イベントの共通構造を表す値オブジェクト。
 */
export type WebhookEventType = 'follow' | 'unfollow' | 'message' | 'postback';

export interface WebhookEventSource {
  readonly type: 'user' | 'group' | 'room';
  readonly userId?: string;
  readonly groupId?: string;
  readonly roomId?: string;
}

export class WebhookEvent {
  private constructor(
    public readonly eventType: WebhookEventType,
    public readonly timestamp: Date,
    public readonly source: WebhookEventSource,
    public readonly webhookEventId?: string,
  ) {
    Object.freeze(this);
  }

  static create(params: {
    eventType: WebhookEventType;
    timestamp: Date;
    source: WebhookEventSource;
    webhookEventId?: string;
  }): WebhookEvent {
    if (!params.eventType) {
      throw new Error('WebhookEvent eventType is required');
    }
    if (!params.timestamp) {
      throw new Error('WebhookEvent timestamp is required');
    }
    if (!params.source) {
      throw new Error('WebhookEvent source is required');
    }
    return new WebhookEvent(
      params.eventType,
      params.timestamp,
      params.source,
      params.webhookEventId,
    );
  }

  isFollowEvent(): boolean {
    return this.eventType === 'follow';
  }

  isUnfollowEvent(): boolean {
    return this.eventType === 'unfollow';
  }

  isMessageEvent(): boolean {
    return this.eventType === 'message';
  }
}
