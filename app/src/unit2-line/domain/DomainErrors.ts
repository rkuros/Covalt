/**
 * Unit 2 ドメインエラー定義。
 */

export class InvalidLiffTokenError extends Error {
  constructor(message = 'LIFFアクセストークンが無効です') {
    super(message);
    this.name = 'InvalidLiffTokenError';
  }
}

export class UserBlockedError extends Error {
  constructor(
    message = 'ユーザーがアカウントをブロックしているため送信できません',
  ) {
    super(message);
    this.name = 'UserBlockedError';
  }
}

export class ChannelConfigNotFoundError extends Error {
  constructor(ownerId: string) {
    super(`LINE チャネル設定が見つかりません: ownerId=${ownerId}`);
    this.name = 'ChannelConfigNotFoundError';
  }
}

export class WebhookSignatureVerificationError extends Error {
  constructor(message = 'Webhook 署名検証に失敗しました') {
    super(message);
    this.name = 'WebhookSignatureVerificationError';
  }
}

export class DuplicateWebhookEventError extends Error {
  constructor(webhookEventId: string) {
    super(`重複する Webhook イベントです: webhookEventId=${webhookEventId}`);
    this.name = 'DuplicateWebhookEventError';
  }
}
