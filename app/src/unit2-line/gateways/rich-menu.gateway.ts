import { Injectable } from '@nestjs/common';
import { RichMenuGateway, RichMenuConfig } from '../domain/RichMenuGateway';

/**
 * リッチメニュー操作 Gateway の仮実装。
 * 本番では LINE Rich Menu API を呼び出す。現時点では console.log で代替する。
 */
@Injectable()
export class RichMenuGatewayImpl implements RichMenuGateway {
  async createRichMenu(
    channelAccessToken: string,
    config: RichMenuConfig,
  ): Promise<string> {
    const richMenuId = `richmenu-${Date.now()}`;
    console.log('[LINE Rich Menu API] createRichMenu called', {
      channelAccessToken: channelAccessToken.substring(0, 8) + '...',
      name: config.name,
      liffUrl: config.liffUrl,
      richMenuId,
    });
    return richMenuId;
  }

  async setDefaultRichMenu(
    channelAccessToken: string,
    richMenuId: string,
  ): Promise<void> {
    console.log('[LINE Rich Menu API] setDefaultRichMenu called', {
      channelAccessToken: channelAccessToken.substring(0, 8) + '...',
      richMenuId,
    });
  }
}
