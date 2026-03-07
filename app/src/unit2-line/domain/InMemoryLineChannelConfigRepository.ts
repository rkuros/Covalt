import { LineChannelConfig } from "./LineChannelConfig";
import { LineChannelConfigRepository } from "./LineChannelConfigRepository";

/**
 * LineChannelConfigRepository のインメモリ実装。
 */
export class InMemoryLineChannelConfigRepository
  implements LineChannelConfigRepository
{
  private readonly store = new Map<string, LineChannelConfig>();

  async findById(id: string): Promise<LineChannelConfig | null> {
    return this.store.get(id) ?? null;
  }

  async findByOwnerId(ownerId: string): Promise<LineChannelConfig | null> {
    for (const config of this.store.values()) {
      if (config.ownerId === ownerId) {
        return config;
      }
    }
    return null;
  }

  async save(config: LineChannelConfig): Promise<void> {
    this.store.set(config.id, config);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  /** テストユーティリティ: ストアをクリアする */
  clear(): void {
    this.store.clear();
  }
}
