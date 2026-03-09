import { LineUserId } from './LineUserId';
import { PushMessage } from './PushMessage';
import { LineChannelConfigRepository } from './LineChannelConfigRepository';
import { LineFriendshipRepository } from './LineFriendshipRepository';
import { LineMessagingGateway } from './LineMessagingGateway';
import { ChannelConfigNotFoundError, UserBlockedError } from './DomainErrors';

/**
 * ownerId に紐づくチャネルアクセストークンを用いて LINE Messaging API 経由で
 * プッシュメッセージを送信するドメインサービス。
 * ブロック済みユーザーへの送信エラーをハンドリングする。
 * Pact: A9 (Unit 5 -> Unit 2)
 */
export interface MessagePushResult {
  success: boolean;
  messageId: string;
}

export class MessagePushService {
  constructor(
    private readonly channelConfigRepository: LineChannelConfigRepository,
    private readonly friendshipRepository: LineFriendshipRepository,
    private readonly messagingGateway: LineMessagingGateway,
  ) {}

  async pushMessage(
    ownerId: string,
    lineUserId: LineUserId,
    messages: PushMessage[],
  ): Promise<MessagePushResult> {
    // チャネル設定を取得
    const config = await this.channelConfigRepository.findByOwnerId(ownerId);
    if (!config) {
      throw new ChannelConfigNotFoundError(ownerId);
    }

    // ブロック済みユーザーチェック
    const friendship =
      await this.friendshipRepository.findByOwnerIdAndLineUserId(
        ownerId,
        lineUserId,
      );
    if (friendship && friendship.isBlocked()) {
      throw new UserBlockedError();
    }

    // LINE Messaging API 経由でプッシュメッセージ送信
    const messageId = await this.messagingGateway.pushMessage(
      config.channelAccessToken,
      lineUserId.value,
      messages,
    );

    return { success: true, messageId };
  }
}
