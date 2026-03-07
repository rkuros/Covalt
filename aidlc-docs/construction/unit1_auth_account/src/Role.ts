/**
 * 値オブジェクト: Role
 * ユーザーのロール種別を表す。認証検証レスポンスで返却される。
 */
export class Role {
  static readonly OWNER = new Role("owner");
  static readonly ADMIN = new Role("admin");

  readonly value: "owner" | "admin";

  private constructor(value: "owner" | "admin") {
    this.value = value;
  }

  static create(value: string): Role {
    if (value === "owner") return Role.OWNER;
    if (value === "admin") return Role.ADMIN;
    throw new Error(`不正なロールです: ${value}`);
  }

  equals(other: Role): boolean {
    return this.value === other.value;
  }
}
