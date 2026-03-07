import { CustomerCommandService } from "./CustomerCommandService";

/**
 * line.friend_added イベントペイロード（E7）
 * Provider: Unit 2（LINE 連携基盤）
 */
export interface LineFriendAddedEvent {
  eventType: "line.friend_added";
  ownerId: string;
  lineUserId: string;
  displayName: string;
  timestamp: string;
}

/**
 * CustomerAutoRegistrationHandler - LINE 友だち追加イベントハンドラ
 *
 * line.friend_added イベントを購読し、顧客自動登録を実行する。
 *
 * 処理内容:
 * 1. ownerId + lineUserId の組み合わせで既存顧客を検索する
 * 2. 該当顧客が存在しない場合、新規 Customer を生成して永続化する
 * 3. 該当顧客が既に存在する場合、重複登録を行わない（冪等性の担保）
 *
 * 冪等性は CustomerCommandService.createFromLineFollow に委譲。
 */
export class CustomerAutoRegistrationHandler {
  constructor(
    private readonly customerCommandService: CustomerCommandService
  ) {}

  /**
   * line.friend_added イベントを処理する
   */
  async handle(event: LineFriendAddedEvent): Promise<void> {
    if (event.eventType !== "line.friend_added") {
      console.warn(
        `[CustomerAutoRegistrationHandler] Unexpected event type: ${event.eventType}. Ignoring.`
      );
      return;
    }

    console.log(
      `[CustomerAutoRegistrationHandler] Processing line.friend_added for ownerId=${event.ownerId}, lineUserId=${event.lineUserId}`
    );

    try {
      await this.customerCommandService.createFromLineFollow({
        ownerId: event.ownerId,
        lineUserId: event.lineUserId,
        displayName: event.displayName,
      });

      console.log(
        `[CustomerAutoRegistrationHandler] Successfully processed line.friend_added for lineUserId=${event.lineUserId}`
      );
    } catch (error) {
      console.error(
        `[CustomerAutoRegistrationHandler] Failed to process line.friend_added for lineUserId=${event.lineUserId}`,
        error
      );
      throw error;
    }
  }
}
