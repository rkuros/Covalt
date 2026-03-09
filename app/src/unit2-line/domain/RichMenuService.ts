import { LineChannelConfigRepository } from './LineChannelConfigRepository';
import { RichMenuGateway, RichMenuConfig } from './RichMenuGateway';
import { ChannelConfigNotFoundError } from './DomainErrors';

export class RichMenuService {
  constructor(
    private readonly channelConfigRepository: LineChannelConfigRepository,
    private readonly richMenuGateway: RichMenuGateway,
  ) {}

  async setupDefaultRichMenu(
    ownerId: string,
    menuName: string,
    imagePng?: Buffer,
  ): Promise<string> {
    const config = await this.channelConfigRepository.findByOwnerId(ownerId);
    if (!config) {
      throw new ChannelConfigNotFoundError(ownerId);
    }

    // Include ownerId so the LIFF page knows which owner it belongs to
    const liffUrl = `https://liff.line.me/${config.liffId}?ownerId=${ownerId}`;

    const richMenuConfig: RichMenuConfig = { name: menuName, liffUrl };

    const richMenuId = await this.richMenuGateway.createRichMenu(
      config.channelAccessToken,
      richMenuConfig,
    );

    if (imagePng) {
      await this.richMenuGateway.uploadRichMenuImage(
        config.channelAccessToken,
        richMenuId,
        imagePng,
      );
    }

    await this.richMenuGateway.setDefaultRichMenu(
      config.channelAccessToken,
      richMenuId,
    );

    return richMenuId;
  }
}
