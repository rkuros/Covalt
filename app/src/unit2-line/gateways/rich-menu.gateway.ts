import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RichMenuGateway, RichMenuConfig } from '../domain/RichMenuGateway';

@Injectable()
export class RichMenuGatewayImpl implements RichMenuGateway {
  async createRichMenu(
    channelAccessToken: string,
    config: RichMenuConfig,
  ): Promise<string> {
    const body = {
      size: { width: 2500, height: 843 },
      selected: true,
      name: config.name,
      chatBarText: 'メニュー',
      areas: [
        {
          bounds: { x: 0, y: 0, width: Math.floor(2500 / 3), height: 843 },
          action: { type: 'uri', label: '予約する', uri: config.liffUrl + '&page=book' },
        },
        {
          bounds: { x: Math.floor(2500 / 3), y: 0, width: Math.floor(2500 / 3), height: 843 },
          action: { type: 'uri', label: '予約確認', uri: config.liffUrl + '&page=confirm' },
        },
        {
          bounds: { x: Math.floor(2500 / 3) * 2, y: 0, width: 2500 - Math.floor(2500 / 3) * 2, height: 843 },
          action: { type: 'uri', label: '施術履歴', uri: config.liffUrl + '&page=history' },
        },
      ],
    };

    const response = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`LINE createRichMenu failed: ${response.status} ${JSON.stringify(err)}`);
    }

    const result = (await response.json()) as { richMenuId: string };
    console.log('[LINE Rich Menu API] created', result.richMenuId);
    return result.richMenuId;
  }

  async uploadRichMenuImage(channelAccessToken: string, richMenuId: string, imagePng: Buffer): Promise<void> {
    const response = await fetch(
      `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${channelAccessToken}` },
        body: new Uint8Array(imagePng),
      },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`LINE uploadRichMenuImage failed: ${response.status} ${JSON.stringify(err)}`);
    }
    console.log('[LINE Rich Menu API] image uploaded for', richMenuId);
  }

  async setDefaultRichMenu(channelAccessToken: string, richMenuId: string): Promise<void> {
    const response = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
      { method: 'POST', headers: { Authorization: `Bearer ${channelAccessToken}` } },
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`LINE setDefaultRichMenu failed: ${response.status} ${JSON.stringify(err)}`);
    }
    console.log('[LINE Rich Menu API] default set to', richMenuId);
  }

  generateDefaultImage(): Buffer {
    // nest build copies assets to dist/<relative> (without src/ prefix)
    // __dirname at runtime is dist/src/unit2-line/gateways/
    return readFileSync(join(__dirname, '..', '..', '..', 'unit2-line', 'assets', 'rich-menu.png'));
  }
}
