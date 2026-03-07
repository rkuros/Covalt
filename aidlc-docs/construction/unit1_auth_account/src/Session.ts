import { randomUUID } from "crypto";
import { AuthToken } from "./AuthToken";

/**
 * エンティティ: Session
 * ログイン済みセッションを表す。
 * タイムアウト判定と認証トークン検証の根拠となる (BR-03, BR-04, BR-05)。
 */
export class Session {
  readonly sessionId: string;
  readonly ownerId: string;
  readonly token: AuthToken;
  readonly createdAt: Date;
  readonly expiresAt: Date;

  private static readonly SESSION_HOURS = 24;

  private constructor(
    sessionId: string,
    ownerId: string,
    token: AuthToken,
    createdAt: Date,
    expiresAt: Date,
  ) {
    this.sessionId = sessionId;
    this.ownerId = ownerId;
    this.token = token;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  /**
   * 新しいセッションを発行する (BR-03)。
   */
  static create(ownerId: string): Session {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Session.SESSION_HOURS * 60 * 60 * 1000);
    return new Session(
      randomUUID(),
      ownerId,
      AuthToken.generate(),
      now,
      expiresAt,
    );
  }

  /**
   * リポジトリからの復元用。
   */
  static reconstruct(
    sessionId: string,
    ownerId: string,
    token: AuthToken,
    createdAt: Date,
    expiresAt: Date,
  ): Session {
    return new Session(sessionId, ownerId, token, createdAt, expiresAt);
  }

  /**
   * セッションが有効（期限内）かどうかを判定する (BR-05)。
   */
  isValid(): boolean {
    return new Date() < this.expiresAt;
  }
}
