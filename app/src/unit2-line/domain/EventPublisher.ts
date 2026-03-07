import { LineFriendAddedEvent } from "./LineFriendAddedEvent";

/**
 * ドメインイベント発行 Gateway インターフェース。
 * 非同期メッセージング基盤への発行を抽象化する。
 * 実装は後続の Integration フェーズで行う。
 */
export interface EventPublisher {
  /**
   * line.friend_added イベントを発行する (E7)。
   */
  publishFriendAdded(event: LineFriendAddedEvent): Promise<void>;
}
