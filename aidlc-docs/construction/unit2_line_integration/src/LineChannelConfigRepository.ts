import { LineChannelConfig } from "./LineChannelConfig";

/**
 * LineChannelConfig リポジトリインターフェース。
 */
export interface LineChannelConfigRepository {
  findById(id: string): Promise<LineChannelConfig | null>;
  findByOwnerId(ownerId: string): Promise<LineChannelConfig | null>;
  save(config: LineChannelConfig): Promise<void>;
  delete(id: string): Promise<void>;
}
