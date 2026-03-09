import { randomUUID } from 'crypto';
import { LineUserId } from './LineUserId';
import { LineFriendship } from './LineFriendship';
import { LineFriendAddedEvent } from './LineFriendAddedEvent';
import { PushMessage } from './PushMessage';
import { WebhookEvent } from './WebhookEvent';
import { LineFriendshipRepository } from './LineFriendshipRepository';
import { LineChannelConfigRepository } from './LineChannelConfigRepository';
import { LineMessagingGateway } from './LineMessagingGateway';
import { EventPublisher } from './EventPublisher';
import { ChannelConfigNotFoundError } from './DomainErrors';

/**
 * 友だち追加 (follow) / 解除 (unfollow) イベントを処理するドメインサービス。
 *
 * follow 時:
 * - LineFriendship の作成（再フォロー時は status を active に戻す）
 * - ウェルカムメッセージの送信
 * - line.friend_added イベントの発行 (E7)
 *
 * unfollow 時:
 * - LineFriendship の status を blocked に変更
 */
export class FriendFollowService {
  constructor(
    private readonly friendshipRepository: LineFriendshipRepository,
    private readonly channelConfigRepository: LineChannelConfigRepository,
    private readonly messagingGateway: LineMessagingGateway,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async handleFollow(ownerId: string, event: WebhookEvent): Promise<void> {
    if (!event.source.userId) {
      console.log('Follow event without userId, skipping');
      return;
    }

    const lineUserId = LineUserId.create(event.source.userId);

    // チャネル設定を取得
    const config = await this.channelConfigRepository.findByOwnerId(ownerId);
    if (!config) {
      throw new ChannelConfigNotFoundError(ownerId);
    }

    // プロフィール取得
    const profile = await this.messagingGateway.getProfile(
      config.channelAccessToken,
      lineUserId.value,
    );

    // 既存の友だち関係を確認（再フォロー対応）
    const existing = await this.friendshipRepository.findByOwnerIdAndLineUserId(
      ownerId,
      lineUserId,
    );

    let friendship: LineFriendship;
    if (existing) {
      existing.refollow(profile.displayName);
      friendship = existing;
    } else {
      friendship = LineFriendship.create({
        id: randomUUID(),
        ownerId,
        lineUserId,
        displayName: profile.displayName,
      });
    }

    await this.friendshipRepository.save(friendship);

    // ウェルカムメッセージ送信
    const welcomeMessage = PushMessage.createText(
      '友だち追加ありがとうございます！\nこちらからご予約の確認やリマインダーをお送りします。\n画面下部のメニューからご予約いただけます。',
    );
    await this.messagingGateway.pushMessage(
      config.channelAccessToken,
      lineUserId.value,
      [welcomeMessage],
    );

    // line.friend_added イベント発行
    const domainEvent = LineFriendAddedEvent.create({
      ownerId,
      lineUserId: lineUserId.value,
      displayName: profile.displayName,
    });
    await this.eventPublisher.publishFriendAdded(domainEvent);
  }

  async handleUnfollow(ownerId: string, event: WebhookEvent): Promise<void> {
    if (!event.source.userId) {
      console.log('Unfollow event without userId, skipping');
      return;
    }

    const lineUserId = LineUserId.create(event.source.userId);

    const friendship =
      await this.friendshipRepository.findByOwnerIdAndLineUserId(
        ownerId,
        lineUserId,
      );

    if (friendship) {
      friendship.block();
      await this.friendshipRepository.save(friendship);
    }
  }
}
