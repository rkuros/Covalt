import { Session } from "./Session";
import { AuthToken } from "./AuthToken";

/**
 * リポジトリインターフェース: SessionRepository
 */
export interface SessionRepository {
  save(session: Session): Promise<void>;
  findByToken(token: AuthToken): Promise<Session | null>;
  findByOwnerId(ownerId: string): Promise<Session[]>;
  deleteByToken(token: AuthToken): Promise<void>;
  deleteByOwnerId(ownerId: string): Promise<void>;
}
