import { Session } from "./Session";
import { SessionRepository } from "./SessionRepository";
import { AuthToken } from "./AuthToken";

/**
 * InMemory 実装: SessionRepository
 */
export class InMemorySessionRepository implements SessionRepository {
  private readonly store = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.store.set(session.sessionId, session);
  }

  async findByToken(token: AuthToken): Promise<Session | null> {
    for (const session of this.store.values()) {
      if (session.token.equals(token)) {
        return session;
      }
    }
    return null;
  }

  async findByOwnerId(ownerId: string): Promise<Session[]> {
    const results: Session[] = [];
    for (const session of this.store.values()) {
      if (session.ownerId === ownerId) {
        results.push(session);
      }
    }
    return results;
  }

  async deleteByToken(token: AuthToken): Promise<void> {
    for (const [id, session] of this.store.entries()) {
      if (session.token.equals(token)) {
        this.store.delete(id);
        return;
      }
    }
  }

  async deleteByOwnerId(ownerId: string): Promise<void> {
    for (const [id, session] of this.store.entries()) {
      if (session.ownerId === ownerId) {
        this.store.delete(id);
      }
    }
  }
}
