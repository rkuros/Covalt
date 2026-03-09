import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Req,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { LiffTokenVerificationService } from '../domain/LiffTokenVerificationService';
import { MessagePushService } from '../domain/MessagePushService';
import { WebhookReceiveService } from '../domain/WebhookReceiveService';
import { ChannelConfigService } from '../domain/ChannelConfigService';
import { RichMenuService } from '../domain/RichMenuService';
import { RichMenuGatewayImpl } from '../gateways/rich-menu.gateway';
import { LiffAccessToken } from '../domain/LiffAccessToken';
import { LineUserId } from '../domain/LineUserId';
import { PushMessage } from '../domain/PushMessage';
import { WebhookEvent } from '../domain/WebhookEvent';
import {
  InvalidLiffTokenError,
  UserBlockedError,
  ChannelConfigNotFoundError,
  WebhookSignatureVerificationError,
} from '../domain/DomainErrors';

interface AuthenticatedRequest {
  user: { ownerId: string; email: string; role: string };
}

// --- LIFF Verify DTO ---
interface LiffVerifyBody {
  accessToken: string;
}

// --- Push Message DTO ---
interface PushMessageBody {
  ownerId: string;
  lineUserId: string;
  messages: Array<{ type: 'text' | 'flex'; text: string; altText?: string }>;
}

// --- Webhook DTO ---
interface WebhookBody {
  ownerId: string;
  events: Array<{
    eventType: 'follow' | 'unfollow' | 'message' | 'postback';
    timestamp: string;
    source: { type: 'user' | 'group' | 'room'; userId?: string; groupId?: string; roomId?: string };
    webhookEventId?: string;
  }>;
}

// --- Channel Config DTO ---
interface CreateChannelConfigBody {
  channelAccessToken: string;
  channelSecret: string;
  liffId: string;
  webhookUrl: string;
}

interface UpdateChannelConfigBody {
  channelAccessToken?: string;
  channelSecret?: string;
  liffId?: string;
  webhookUrl?: string;
}

@Controller('api/line')
export class LineController {
  constructor(
    private readonly liffVerificationService: LiffTokenVerificationService,
    private readonly messagePushService: MessagePushService,
    private readonly webhookReceiveService: WebhookReceiveService,
    private readonly channelConfigService: ChannelConfigService,
    private readonly richMenuService: RichMenuService,
    private readonly richMenuGateway: RichMenuGatewayImpl,
  ) {}

  // ==========================================
  // POST /api/line/liff/verify (PACT: A2)
  // ==========================================
  @Post('liff/verify')
  @HttpCode(HttpStatus.OK)
  async verifyLiffToken(@Body() body: LiffVerifyBody) {
    try {
      const accessToken = LiffAccessToken.create(body.accessToken);
      const result = await this.liffVerificationService.verify(accessToken);
      return {
        lineUserId: result.lineUserId,
        displayName: result.displayName,
      };
    } catch (error) {
      if (error instanceof InvalidLiffTokenError) {
        throw new UnauthorizedException({
          error: 'INVALID_LIFF_TOKEN',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // POST /api/line/messages/push (PACT: A9)
  // ==========================================
  @Post('messages/push')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async pushMessage(@Body() body: PushMessageBody) {
    try {
      const lineUserId = LineUserId.create(body.lineUserId);
      const messages = body.messages.map((m) =>
        m.type === 'flex'
          ? PushMessage.createFlex(m.text, m.altText ?? '')
          : PushMessage.createText(m.text),
      );

      const result = await this.messagePushService.pushMessage(
        body.ownerId,
        lineUserId,
        messages,
      );

      return {
        success: result.success,
        messageId: result.messageId,
      };
    } catch (error) {
      if (error instanceof ChannelConfigNotFoundError) {
        throw new NotFoundException({
          error: 'CHANNEL_CONFIG_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof UserBlockedError) {
        throw new BadRequestException({
          error: 'USER_BLOCKED',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // POST /api/line/webhook/:ownerId
  // LINE Platform sends: { destination, events: [{ type, timestamp, webhookEventId, source, ... }] }
  // ==========================================
  @Post('webhook/:ownerId')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('ownerId') ownerId: string,
    @Req() req: any,
    @Body() body: any,
    @Headers('x-line-signature') signature: string,
  ) {
    if (!signature) {
      throw new UnauthorizedException({
        error: 'MISSING_SIGNATURE',
        message: 'x-line-signature header is required',
      });
    }

    try {
      const lineEvents = (body.events ?? []) as Array<{
        type: string;
        timestamp: number;
        webhookEventId?: string;
        source?: { type: string; userId?: string; groupId?: string; roomId?: string };
      }>;

      const supportedTypes = ['follow', 'unfollow', 'message', 'postback'];
      const events = lineEvents
        .filter((e) => supportedTypes.includes(e.type))
        .map((e) =>
          WebhookEvent.create({
            eventType: e.type as 'follow' | 'unfollow' | 'message' | 'postback',
            timestamp: new Date(e.timestamp),
            source: (e.source ?? { type: 'user' }) as { type: 'user' | 'group' | 'room'; userId?: string; groupId?: string; roomId?: string },
            webhookEventId: e.webhookEventId,
          }),
        );

      // Use raw body for signature verification (not re-serialized JSON)
      const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(body);
      await this.webhookReceiveService.receive(
        ownerId,
        rawBody,
        signature,
        events,
      );

      return { status: 'ok' };
    } catch (error) {
      if (error instanceof ChannelConfigNotFoundError) {
        throw new NotFoundException({
          error: 'CHANNEL_CONFIG_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof WebhookSignatureVerificationError) {
        throw new UnauthorizedException({
          error: 'INVALID_SIGNATURE',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // CRUD /api/line/channel-config
  // ==========================================
  @Post('channel-config')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createChannelConfig(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateChannelConfigBody,
  ) {
    try {
      const config = await this.channelConfigService.createConfig({
        ownerId: req.user.ownerId,
        channelAccessToken: body.channelAccessToken,
        channelSecret: body.channelSecret,
        liffId: body.liffId,
        webhookUrl: body.webhookUrl,
      });

      return {
        id: config.id,
        ownerId: config.ownerId,
        liffId: config.liffId,
        webhookUrl: config.webhookUrl,
        isActive: config.isActive,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('既に存在します')) {
        throw new BadRequestException({
          error: 'DUPLICATE_CONFIG',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Get('channel-config')
  @UseGuards(AuthGuard)
  async getChannelConfig(@Req() req: AuthenticatedRequest) {
    try {
      const config = await this.channelConfigService.getConfig(req.user.ownerId);
      return {
        id: config.id,
        ownerId: config.ownerId,
        liffId: config.liffId,
        webhookUrl: config.webhookUrl,
        isActive: config.isActive,
      };
    } catch (error) {
      if (error instanceof ChannelConfigNotFoundError) {
        throw new NotFoundException({
          error: 'CHANNEL_CONFIG_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Put('channel-config')
  @UseGuards(AuthGuard)
  async updateChannelConfig(
    @Req() req: AuthenticatedRequest,
    @Body() body: UpdateChannelConfigBody,
  ) {
    try {
      let config;
      if (body.channelAccessToken && body.channelSecret) {
        config = await this.channelConfigService.updateCredentials(
          req.user.ownerId,
          body.channelAccessToken,
          body.channelSecret,
        );
      }
      if (body.liffId) {
        config = await this.channelConfigService.updateLiffId(
          req.user.ownerId,
          body.liffId,
        );
      }
      if (!config) {
        config = await this.channelConfigService.getConfig(req.user.ownerId);
      }

      return {
        id: config.id,
        ownerId: config.ownerId,
        liffId: config.liffId,
        webhookUrl: config.webhookUrl,
        isActive: config.isActive,
      };
    } catch (error) {
      if (error instanceof ChannelConfigNotFoundError) {
        throw new NotFoundException({
          error: 'CHANNEL_CONFIG_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  @Delete('channel-config')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChannelConfig(@Req() req: AuthenticatedRequest) {
    try {
      await this.channelConfigService.deleteConfig(req.user.ownerId);
    } catch (error) {
      if (error instanceof ChannelConfigNotFoundError) {
        throw new NotFoundException({
          error: 'CHANNEL_CONFIG_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // POST /api/line/rich-menu/setup
  // ==========================================
  @Post('rich-menu/setup')
  @UseGuards(AuthGuard)
  async setupRichMenu(
    @Req() req: AuthenticatedRequest,
    @Body() body: { menuName?: string },
  ) {
    try {
      const imagePng = this.richMenuGateway.generateDefaultImage();
      const richMenuId = await this.richMenuService.setupDefaultRichMenu(
        req.user.ownerId,
        body.menuName || '予約メニュー',
        imagePng,
      );
      return { richMenuId };
    } catch (error) {
      if (error instanceof ChannelConfigNotFoundError) {
        throw new NotFoundException({
          error: 'CHANNEL_CONFIG_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }
}
