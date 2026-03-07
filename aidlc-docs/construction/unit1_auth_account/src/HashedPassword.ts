import { createHash } from "crypto";

/**
 * 値オブジェクト: HashedPassword
 * パスワードのハッシュ化済み表現を保持する。平文パスワードとの照合責務を持つ。
 *
 * 注: 本実装では外部依存を避けるため SHA-256 を使用する。
 * 本番環境では bcrypt 等のパスワード専用ハッシュに置き換えること。
 */
export class HashedPassword {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * 平文パスワードからハッシュ化して生成する。
   */
  static create(plainPassword: string): HashedPassword {
    if (!plainPassword || plainPassword.length < 8) {
      throw new Error("パスワードは8文字以上である必要があります");
    }
    const hash = createHash("sha256").update(plainPassword).digest("hex");
    return new HashedPassword(hash);
  }

  /**
   * 既にハッシュ化済みの値から復元する（リポジトリからの読み込み用）。
   */
  static fromHash(hash: string): HashedPassword {
    if (!hash || hash.length === 0) {
      throw new Error("ハッシュ値は必須です");
    }
    return new HashedPassword(hash);
  }

  /**
   * 平文パスワードがこのハッシュと一致するか検証する。
   */
  matches(plainPassword: string): boolean {
    const hash = createHash("sha256").update(plainPassword).digest("hex");
    return this.value === hash;
  }

  equals(other: HashedPassword): boolean {
    return this.value === other.value;
  }
}
