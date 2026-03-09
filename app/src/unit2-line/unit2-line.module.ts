import { Module, OnModuleInit } from '@nestjs/common';

// Repositories
import { PrismaLineChannelConfigRepository } from './repositories/prisma-line-channel-config.repository';
import { PrismaLineFriendshipRepository } from './repositories/prisma-line-friendship.repository';

// Gateways
import { LineMessagingGatewayImpl } from './gateways/line-messaging.gateway';
import { LiffVerificationGatewayImpl } from './gateways/liff-verification.gateway';
import { RichMenuGatewayImpl } from './gateways/rich-menu.gateway';
import { LineEventPublisher } from './gateways/line-event.publisher';

// Domain Services
import { ChannelConfigService } from './domain/ChannelConfigService';
import { LiffTokenVerificationService } from './domain/LiffTokenVerificationService';
import { MessagePushService } from './domain/MessagePushService';
import { WebhookReceiveService } from './domain/WebhookReceiveService';
import { FriendFollowService } from './domain/FriendFollowService';
import { RichMenuService } from './domain/RichMenuService';

// Controllers
import { LineController } from './controllers/line.controller';

@Module({
  imports: [],
  controllers: [LineController],
  providers: [
    // Infrastructure: Repositories
    PrismaLineChannelConfigRepository,
    PrismaLineFriendshipRepository,

    // Infrastructure: Gateways
    LineMessagingGatewayImpl,
    LiffVerificationGatewayImpl,
    RichMenuGatewayImpl,
    LineEventPublisher,

    // Domain: ChannelConfigService
    {
      provide: ChannelConfigService,
      useFactory: (
        channelConfigRepo: PrismaLineChannelConfigRepository,
        messagingGateway: LineMessagingGatewayImpl,
      ) => new ChannelConfigService(channelConfigRepo, messagingGateway),
      inject: [PrismaLineChannelConfigRepository, LineMessagingGatewayImpl],
    },

    // Domain: LiffTokenVerificationService
    {
      provide: LiffTokenVerificationService,
      useFactory: (liffGateway: LiffVerificationGatewayImpl) =>
        new LiffTokenVerificationService(liffGateway),
      inject: [LiffVerificationGatewayImpl],
    },

    // Domain: MessagePushService
    {
      provide: MessagePushService,
      useFactory: (
        channelConfigRepo: PrismaLineChannelConfigRepository,
        friendshipRepo: PrismaLineFriendshipRepository,
        messagingGateway: LineMessagingGatewayImpl,
      ) => new MessagePushService(channelConfigRepo, friendshipRepo, messagingGateway),
      inject: [
        PrismaLineChannelConfigRepository,
        PrismaLineFriendshipRepository,
        LineMessagingGatewayImpl,
      ],
    },

    // Domain: WebhookReceiveService
    {
      provide: WebhookReceiveService,
      useFactory: (channelConfigRepo: PrismaLineChannelConfigRepository) =>
        new WebhookReceiveService(channelConfigRepo),
      inject: [PrismaLineChannelConfigRepository],
    },

    // Domain: FriendFollowService
    {
      provide: FriendFollowService,
      useFactory: (
        friendshipRepo: PrismaLineFriendshipRepository,
        channelConfigRepo: PrismaLineChannelConfigRepository,
        messagingGateway: LineMessagingGatewayImpl,
        eventPublisher: LineEventPublisher,
      ) =>
        new FriendFollowService(
          friendshipRepo,
          channelConfigRepo,
          messagingGateway,
          eventPublisher,
        ),
      inject: [
        PrismaLineFriendshipRepository,
        PrismaLineChannelConfigRepository,
        LineMessagingGatewayImpl,
        LineEventPublisher,
      ],
    },

    // Domain: RichMenuService
    {
      provide: RichMenuService,
      useFactory: (
        channelConfigRepo: PrismaLineChannelConfigRepository,
        richMenuGateway: RichMenuGatewayImpl,
      ) => new RichMenuService(channelConfigRepo, richMenuGateway),
      inject: [PrismaLineChannelConfigRepository, RichMenuGatewayImpl],
    },
  ],
  exports: [
    MessagePushService,
    ChannelConfigService,
    LiffTokenVerificationService,
    PrismaLineChannelConfigRepository,
    PrismaLineFriendshipRepository,
  ],
})
export class Unit2LineModule implements OnModuleInit {
  constructor(
    private readonly webhookReceiveService: WebhookReceiveService,
    private readonly friendFollowService: FriendFollowService,
  ) {}

  onModuleInit() {
    this.webhookReceiveService.registerHandler('follow', (ownerId, event) =>
      this.friendFollowService.handleFollow(ownerId, event),
    );
    this.webhookReceiveService.registerHandler('unfollow', (ownerId, event) =>
      this.friendFollowService.handleUnfollow(ownerId, event),
    );
  }
}
