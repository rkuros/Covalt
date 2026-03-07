import { PasswordResetToken } from "./PasswordResetToken";
import { PasswordResetTokenRepository } from "./PasswordResetTokenRepository";
import { AuthToken } from "./AuthToken";

/**
 * InMemory 実装: PasswordResetTokenRepository
 */
export class InMemoryPasswordResetTokenRepository implements PasswordResetTokenRepository {
  private readonly store = new Map<string, PasswordResetToken>();

  async save(token: PasswordResetToken): Promise<void> {
    this.store.set(token.tokenId, token);
  }

  async findByToken(token: AuthToken): Promise<PasswordResetToken | null> {
    for (const resetToken of this.store.values()) {
      if (resetToken.token.equals(token)) {
        return resetToken;
      }
    }
    return null;
  }

  async findByOwnerId(ownerId: string): Promise<PasswordResetToken[]> {
    const results: PasswordResetToken[] = [];
    for (const resetToken of this.store.values()) {
      if (resetToken.ownerId === ownerId) {
        results.push(resetToken);
      }
    }
    return results;
  }
}
