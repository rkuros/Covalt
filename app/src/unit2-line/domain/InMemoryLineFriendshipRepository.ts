import { LineUserId } from "./LineUserId";
import { LineFriendship } from "./LineFriendship";
import { LineFriendshipRepository } from "./LineFriendshipRepository";

/**
 * LineFriendshipRepository のインメモリ実装。
 */
export class InMemoryLineFriendshipRepository
  implements LineFriendshipRepository
{
  private readonly store = new Map<string, LineFriendship>();

  async findById(id: string): Promise<LineFriendship | null> {
    return this.store.get(id) ?? null;
  }

  async findByOwnerIdAndLineUserId(
    ownerId: string,
    lineUserId: LineUserId,
  ): Promise<LineFriendship | null> {
    for (const friendship of this.store.values()) {
      if (
        friendship.ownerId === ownerId &&
        friendship.lineUserId.equals(lineUserId)
      ) {
        return friendship;
      }
    }
    return null;
  }

  async findAllByOwnerId(ownerId: string): Promise<LineFriendship[]> {
    const results: LineFriendship[] = [];
    for (const friendship of this.store.values()) {
      if (friendship.ownerId === ownerId) {
        results.push(friendship);
      }
    }
    return results;
  }

  async save(friendship: LineFriendship): Promise<void> {
    this.store.set(friendship.id, friendship);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  /** テストユーティリティ: ストアをクリアする */
  clear(): void {
    this.store.clear();
  }
}
