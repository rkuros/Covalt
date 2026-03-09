import { LineUserId } from './LineUserId';
import { LineFriendship } from './LineFriendship';

/**
 * LineFriendship リポジトリインターフェース。
 */
export interface LineFriendshipRepository {
  findById(id: string): Promise<LineFriendship | null>;
  findByOwnerIdAndLineUserId(
    ownerId: string,
    lineUserId: LineUserId,
  ): Promise<LineFriendship | null>;
  findAllByOwnerId(ownerId: string): Promise<LineFriendship[]>;
  save(friendship: LineFriendship): Promise<void>;
  delete(id: string): Promise<void>;
}
