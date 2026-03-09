import { PasswordResetToken } from './PasswordResetToken';
import { AuthToken } from './AuthToken';

/**
 * リポジトリインターフェース: PasswordResetTokenRepository
 */
export interface PasswordResetTokenRepository {
  save(token: PasswordResetToken): Promise<void>;
  findByToken(token: AuthToken): Promise<PasswordResetToken | null>;
  findByOwnerId(ownerId: string): Promise<PasswordResetToken[]>;
}
