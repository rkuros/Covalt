/**
 * オーナーごとの LINE 公式アカウント接続設定エンティティ。
 * Messaging API / LIFF / Webhook の認証情報を一元管理する。
 */
export class LineChannelConfig {
  private constructor(
    public readonly id: string,
    public readonly ownerId: string,
    private _channelAccessToken: string,
    private _channelSecret: string,
    private _liffId: string,
    private _webhookUrl: string,
    private _isActive: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(params: {
    id: string;
    ownerId: string;
    channelAccessToken: string;
    channelSecret: string;
    liffId: string;
    webhookUrl: string;
  }): LineChannelConfig {
    if (!params.ownerId || params.ownerId.trim().length === 0) {
      throw new Error("ownerId is required");
    }
    if (!params.channelAccessToken || params.channelAccessToken.trim().length === 0) {
      throw new Error("channelAccessToken is required");
    }
    if (!params.channelSecret || params.channelSecret.trim().length === 0) {
      throw new Error("channelSecret is required");
    }
    if (!params.liffId || params.liffId.trim().length === 0) {
      throw new Error("liffId is required");
    }

    const now = new Date();
    return new LineChannelConfig(
      params.id,
      params.ownerId,
      params.channelAccessToken,
      params.channelSecret,
      params.liffId,
      params.webhookUrl,
      true,
      now,
      now,
    );
  }

  static reconstruct(params: {
    id: string;
    ownerId: string;
    channelAccessToken: string;
    channelSecret: string;
    liffId: string;
    webhookUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): LineChannelConfig {
    return new LineChannelConfig(
      params.id,
      params.ownerId,
      params.channelAccessToken,
      params.channelSecret,
      params.liffId,
      params.webhookUrl,
      params.isActive,
      params.createdAt,
      params.updatedAt,
    );
  }

  get channelAccessToken(): string {
    return this._channelAccessToken;
  }

  get channelSecret(): string {
    return this._channelSecret;
  }

  get liffId(): string {
    return this._liffId;
  }

  get webhookUrl(): string {
    return this._webhookUrl;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  updateCredentials(channelAccessToken: string, channelSecret: string): void {
    if (!channelAccessToken || channelAccessToken.trim().length === 0) {
      throw new Error("channelAccessToken is required");
    }
    if (!channelSecret || channelSecret.trim().length === 0) {
      throw new Error("channelSecret is required");
    }
    this._channelAccessToken = channelAccessToken;
    this._channelSecret = channelSecret;
    this._updatedAt = new Date();
  }

  updateLiffId(liffId: string): void {
    if (!liffId || liffId.trim().length === 0) {
      throw new Error("liffId is required");
    }
    this._liffId = liffId;
    this._updatedAt = new Date();
  }

  updateWebhookUrl(webhookUrl: string): void {
    this._webhookUrl = webhookUrl;
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }
}
