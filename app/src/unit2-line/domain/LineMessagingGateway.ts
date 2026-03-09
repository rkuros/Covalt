import { PushMessage } from './PushMessage';

/**
 * LINE Messaging API Gateway インターフェース。
 * Push Message API / Get Profile API への外部呼び出しを抽象化する。
 * 実装は後続の Integration フェーズで行う。
 */
export interface LineUserProfile {
  readonly lineUserId: string;
  readonly displayName: string;
}

export interface LineMessagingGateway {
  /**
   * プッシュメッセージを送信する。
   * @param channelAccessToken チャネルアクセストークン
   * @param lineUserId 送信先 LINE ユーザー ID
   * @param messages 送信メッセージ配列
   * @returns メッセージ ID
   * @throws UserBlockedError ユーザーがブロック済みの場合
   */
  pushMessage(
    channelAccessToken: string,
    lineUserId: string,
    messages: PushMessage[],
  ): Promise<string>;

  /**
   * LINE ユーザーのプロフィールを取得する。
   * @param channelAccessToken チャネルアクセストークン
   * @param lineUserId LINE ユーザー ID
   */
  getProfile(
    channelAccessToken: string,
    lineUserId: string,
  ): Promise<LineUserProfile>;
}
