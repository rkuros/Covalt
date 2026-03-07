import { LineChannelConfigRepository } from "./LineChannelConfigRepository";
import { RichMenuGateway, RichMenuConfig } from "./RichMenuGateway";
import { ChannelConfigNotFoundError } from "./DomainErrors";

/**
 * リッチメニューの作成・設定を LINE Platform に対して行うドメインサービス。
 * LIFF URL の埋め込みを管理する。
 */
export class RichMenuService {
  constructor(
    private readonly channelConfigRepository: LineChannelConfigRepository,
    private readonly richMenuGateway: RichMenuGateway,
  ) {}

  /**
   * リッチメニューを作成し、デフォルトメニューとして設定する。
   * LIFF URL は LineChannelConfig の liffId から自動生成する。
   */
  async setupDefaultRichMenu(
    ownerId: string,
    menuName: string,
  ): Promise<string> {
    const config = await this.channelConfigRepository.findByOwnerId(ownerId);
    if (!config) {
      throw new ChannelConfigNotFoundError(ownerId);
    }

    const liffUrl = `https://liff.line.me/${config.liffId}`;

    const richMenuConfig: RichMenuConfig = {
      name: menuName,
      liffUrl,
    };

    // リッチメニュー作成
    const richMenuId = await this.richMenuGateway.createRichMenu(
      config.channelAccessToken,
      richMenuConfig,
    );

    // デフォルトリッチメニューとして設定
    await this.richMenuGateway.setDefaultRichMenu(
      config.channelAccessToken,
      richMenuId,
    );

    return richMenuId;
  }
}
