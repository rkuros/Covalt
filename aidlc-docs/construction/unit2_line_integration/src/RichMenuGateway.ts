/**
 * リッチメニュー操作 Gateway インターフェース。
 * LINE Rich Menu API への外部呼び出しを抽象化する。
 * 実装は後続の Integration フェーズで行う。
 */
export interface RichMenuConfig {
  readonly name: string;
  readonly liffUrl: string;
}

export interface RichMenuGateway {
  /**
   * リッチメニューを作成する。
   * @param channelAccessToken チャネルアクセストークン
   * @param config リッチメニュー設定
   * @returns リッチメニュー ID
   */
  createRichMenu(
    channelAccessToken: string,
    config: RichMenuConfig,
  ): Promise<string>;

  /**
   * デフォルトリッチメニューを設定する。
   * @param channelAccessToken チャネルアクセストークン
   * @param richMenuId リッチメニュー ID
   */
  setDefaultRichMenu(
    channelAccessToken: string,
    richMenuId: string,
  ): Promise<void>;
}
