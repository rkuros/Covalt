import { randomUUID } from "crypto";
import { EmailAddress } from "./EmailAddress";
import { HashedPassword } from "./HashedPassword";
import { Role } from "./Role";
import { AccountStatus } from "./AccountStatus";

/**
 * エンティティ: OwnerAccount
 * オーナーの認証情報とアカウント状態のライフサイクルを管理する。
 * ログイン認証・アカウント有効化/無効化の判定主体。
 */
export class OwnerAccount {
  readonly ownerId: string;
  readonly email: EmailAddress;
  private _passwordHash: HashedPassword;
  readonly role: Role;
  private _status: AccountStatus;
  readonly createdAt: Date;
  private _updatedAt: Date;

  private constructor(
    ownerId: string,
    email: EmailAddress,
    passwordHash: HashedPassword,
    status: AccountStatus,
    createdAt: Date,
    updatedAt: Date,
  ) {
    this.ownerId = ownerId;
    this.email = email;
    this._passwordHash = passwordHash;
    this.role = Role.OWNER;
    this._status = status;
    this.createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  /**
   * 新規オーナーアカウントを作成する。初期状態は ACTIVE。
   */
  static create(email: EmailAddress, passwordHash: HashedPassword): OwnerAccount {
    const now = new Date();
    return new OwnerAccount(
      randomUUID(),
      email,
      passwordHash,
      AccountStatus.ACTIVE,
      now,
      now,
    );
  }

  /**
   * リポジトリからの復元用。
   */
  static reconstruct(
    ownerId: string,
    email: EmailAddress,
    passwordHash: HashedPassword,
    status: AccountStatus,
    createdAt: Date,
    updatedAt: Date,
  ): OwnerAccount {
    return new OwnerAccount(ownerId, email, passwordHash, status, createdAt, updatedAt);
  }

  get passwordHash(): HashedPassword {
    return this._passwordHash;
  }

  get status(): AccountStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * パスワードを認証する (BR-01, BR-02)。
   */
  verifyPassword(plainPassword: string): boolean {
    return this._passwordHash.matches(plainPassword);
  }

  /**
   * パスワードを変更する (BR-08)。
   */
  changePassword(newPasswordHash: HashedPassword): void {
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
  }

  /**
   * アカウントを有効化する (BR-13)。
   */
  activate(): void {
    this._status = AccountStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * アカウントを無効化する (BR-13, BR-14)。
   */
  disable(): void {
    this._status = AccountStatus.DISABLED;
    this._updatedAt = new Date();
  }

  /**
   * アカウントがアクティブかどうかを判定する。
   */
  isActive(): boolean {
    return this._status.isActive();
  }
}
