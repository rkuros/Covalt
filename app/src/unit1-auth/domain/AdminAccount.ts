import { randomUUID } from "crypto";
import { EmailAddress } from "./EmailAddress";
import { HashedPassword } from "./HashedPassword";
import { Role } from "./Role";

/**
 * エンティティ: AdminAccount
 * システム管理者の認証情報を保持する。
 * オーナーアカウントの作成・管理操作の実行主体。
 */
export class AdminAccount {
  readonly adminId: string;
  readonly email: EmailAddress;
  private _passwordHash: HashedPassword;
  readonly role: Role;
  readonly createdAt: Date;

  private constructor(
    adminId: string,
    email: EmailAddress,
    passwordHash: HashedPassword,
    createdAt: Date,
  ) {
    this.adminId = adminId;
    this.email = email;
    this._passwordHash = passwordHash;
    this.role = Role.ADMIN;
    this.createdAt = createdAt;
  }

  /**
   * 新規管理者アカウントを作成する。
   */
  static create(email: EmailAddress, passwordHash: HashedPassword): AdminAccount {
    return new AdminAccount(randomUUID(), email, passwordHash, new Date());
  }

  /**
   * リポジトリからの復元用。
   */
  static reconstruct(
    adminId: string,
    email: EmailAddress,
    passwordHash: HashedPassword,
    createdAt: Date,
  ): AdminAccount {
    return new AdminAccount(adminId, email, passwordHash, createdAt);
  }

  get passwordHash(): HashedPassword {
    return this._passwordHash;
  }

  /**
   * パスワードを認証する。
   */
  verifyPassword(plainPassword: string): boolean {
    return this._passwordHash.matches(plainPassword);
  }
}
