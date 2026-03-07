/**
 * 友だち追加 Webhook を受信した際に発行する非同期ドメインイベント (E7)。
 * Consumer: Unit 6 (顧客情報管理) -- 顧客自動登録トリガーとして使用。
 */
export class LineFriendAddedEvent {
  public readonly eventType = "line.friend_added" as const;

  private constructor(
    public readonly ownerId: string,
    public readonly lineUserId: string,
    public readonly displayName: string,
    public readonly timestamp: string,
  ) {
    Object.freeze(this);
  }

  static create(params: {
    ownerId: string;
    lineUserId: string;
    displayName: string;
    timestamp?: Date;
  }): LineFriendAddedEvent {
    if (!params.ownerId || params.ownerId.trim().length === 0) {
      throw new Error("ownerId is required");
    }
    if (!params.lineUserId) {
      throw new Error("lineUserId is required");
    }
    if (!params.displayName || params.displayName.trim().length === 0) {
      throw new Error("displayName is required");
    }

    const ts = params.timestamp ?? new Date();
    return new LineFriendAddedEvent(
      params.ownerId,
      params.lineUserId,
      params.displayName,
      ts.toISOString().replace(/\.\d{3}Z$/, "Z"),
    );
  }

  toPayload(): {
    eventType: "line.friend_added";
    ownerId: string;
    lineUserId: string;
    displayName: string;
    timestamp: string;
  } {
    return {
      eventType: this.eventType,
      ownerId: this.ownerId,
      lineUserId: this.lineUserId,
      displayName: this.displayName,
      timestamp: this.timestamp,
    };
  }
}
