/**
 * リッチメニュー操作 Gateway インターフェース。
 * LINE Rich Menu API への外部呼び出しを抽象化する。
 */
export interface RichMenuConfig {
  readonly name: string;
  readonly liffUrl: string;
}

export interface RichMenuGateway {
  createRichMenu(
    channelAccessToken: string,
    config: RichMenuConfig,
  ): Promise<string>;

  uploadRichMenuImage(
    channelAccessToken: string,
    richMenuId: string,
    imagePng: Buffer,
  ): Promise<void>;

  setDefaultRichMenu(
    channelAccessToken: string,
    richMenuId: string,
  ): Promise<void>;
}
