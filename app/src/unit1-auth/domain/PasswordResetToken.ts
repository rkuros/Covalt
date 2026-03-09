import { randomUUID } from 'crypto';
import { AuthToken } from './AuthToken';

/**
 * エンティティ: PasswordResetToken
 * パスワードリセット要求を表す。
 * 有効期限と使用済みフラグによりワンタイム性を保証する (BR-07)。
 */
export class PasswordResetToken {
  readonly tokenId: string;
  readonly ownerId: string;
  readonly token: AuthToken;
  readonly expiresAt: Date;
  private _usedAt: Date | null;

  private static readonly EXPIRY_HOURS = 24;

  private constructor(
    tokenId: string,
    ownerId: string,
    token: AuthToken,
    expiresAt: Date,
    usedAt: Date | null,
  ) {
    this.tokenId = tokenId;
    this.ownerId = ownerId;
    this.token = token;
    this.expiresAt = expiresAt;
    this._usedAt = usedAt;
  }

  /**
   * 新しいパスワードリセットトークンを生成する (BR-06, BR-07)。
   */
  static create(ownerId: string): PasswordResetToken {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PasswordResetToken.EXPIRY_HOURS * 60 * 60 * 1000,
    );
    return new PasswordResetToken(
      randomUUID(),
      ownerId,
      AuthToken.generate(),
      expiresAt,
      null,
    );
  }

  /**
   * リポジトリからの復元用。
   */
  static reconstruct(
    tokenId: string,
    ownerId: string,
    token: AuthToken,
    expiresAt: Date,
    usedAt: Date | null,
  ): PasswordResetToken {
    return new PasswordResetToken(tokenId, ownerId, token, expiresAt, usedAt);
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  /**
   * トークンが有効かどうかを判定する（期限内かつ未使用）。
   */
  isValid(): boolean {
    const now = new Date();
    return now < this.expiresAt && this._usedAt === null;
  }

  /**
   * トークンを使用済みにする。
   */
  markAsUsed(): void {
    if (!this.isValid()) {
      throw new Error('無効または使用済みのリセットトークンです');
    }
    this._usedAt = new Date();
  }
}
