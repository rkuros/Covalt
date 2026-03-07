import { randomUUID } from "crypto";
import { LineChannelConfig } from "./LineChannelConfig";
import { LineChannelConfigRepository } from "./LineChannelConfigRepository";
import { LineMessagingGateway } from "./LineMessagingGateway";
import { ChannelConfigNotFoundError } from "./DomainErrors";

/**
 * LINE チャネル設定の CRUD と接続テスト（疎通確認）を提供するドメインサービス。
 */
export class ChannelConfigService {
  constructor(
    private readonly channelConfigRepository: LineChannelConfigRepository,
    private readonly messagingGateway: LineMessagingGateway,
  ) {}

  async createConfig(params: {
    ownerId: string;
    channelAccessToken: string;
    channelSecret: string;
    liffId: string;
    webhookUrl: string;
  }): Promise<LineChannelConfig> {
    // 同一オーナーの既存設定を確認
    const existing = await this.channelConfigRepository.findByOwnerId(
      params.ownerId,
    );
    if (existing) {
      throw new Error(
        `LINE チャネル設定は既に存在します: ownerId=${params.ownerId}`,
      );
    }

    const config = LineChannelConfig.create({
      id: randomUUID(),
      ...params,
    });

    await this.channelConfigRepository.save(config);
    return config;
  }

  async getConfig(ownerId: string): Promise<LineChannelConfig> {
    const config = await this.channelConfigRepository.findByOwnerId(ownerId);
    if (!config) {
      throw new ChannelConfigNotFoundError(ownerId);
    }
    return config;
  }

  async updateCredentials(
    ownerId: string,
    channelAccessToken: string,
    channelSecret: string,
  ): Promise<LineChannelConfig> {
    const config = await this.getConfig(ownerId);
    config.updateCredentials(channelAccessToken, channelSecret);
    await this.channelConfigRepository.save(config);
    return config;
  }

  async updateLiffId(
    ownerId: string,
    liffId: string,
  ): Promise<LineChannelConfig> {
    const config = await this.getConfig(ownerId);
    config.updateLiffId(liffId);
    await this.channelConfigRepository.save(config);
    return config;
  }

  async deleteConfig(ownerId: string): Promise<void> {
    const config = await this.getConfig(ownerId);
    await this.channelConfigRepository.delete(config.id);
  }

  /**
   * 接続テスト（疎通確認）。
   * チャネルアクセストークンで Bot 情報を取得し、設定の正当性を確認する。
   */
  async testConnection(ownerId: string): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig(ownerId);

    try {
      // Bot のプロフィールを取得して疎通確認の代替とする
      // （実際には LINE Bot Info API を呼ぶが、ここでは getProfile を利用）
      await this.messagingGateway.getProfile(
        config.channelAccessToken,
        "self",
      );
      return { success: true, message: "接続テストに成功しました" };
    } catch {
      return { success: false, message: "接続テストに失敗しました。設定を確認してください" };
    }
  }
}
