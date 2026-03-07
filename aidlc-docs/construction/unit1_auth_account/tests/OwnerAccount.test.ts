import { describe, it, expect } from "vitest";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { AccountStatus } from "../src/AccountStatus";
import { Role } from "../src/Role";

describe("OwnerAccount", () => {
  const createOwnerAccount = () => {
    const email = EmailAddress.create("owner@example.com");
    const passwordHash = HashedPassword.create("password123");
    return OwnerAccount.create(email, passwordHash);
  };

  // --- 正常系 ---

  it("必要な属性で生成できること", () => {
    const email = EmailAddress.create("owner@example.com");
    const passwordHash = HashedPassword.create("password123");
    const account = OwnerAccount.create(email, passwordHash);

    expect(account.ownerId).toBeTruthy();
    expect(account.email.equals(email)).toBe(true);
    expect(account.passwordHash.equals(passwordHash)).toBe(true);
    expect(account.role.equals(Role.OWNER)).toBe(true);
    expect(account.status.equals(AccountStatus.ACTIVE)).toBe(true);
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.updatedAt).toBeInstanceOf(Date);
  });

  it("role が owner であること", () => {
    const account = createOwnerAccount();
    expect(account.role.value).toBe("owner");
  });

  it("生成時のデフォルト status が ACTIVE であること", () => {
    const account = createOwnerAccount();
    expect(account.status.value).toBe("ACTIVE");
    expect(account.isActive()).toBe(true);
  });

  it("正しいパスワードで認証成功すること (BR-01)", () => {
    const account = createOwnerAccount();
    expect(account.verifyPassword("password123")).toBe(true);
  });

  it("アカウント有効化 -- status を ACTIVE に切り替えられること (BR-13)", () => {
    const account = createOwnerAccount();
    account.disable();
    expect(account.status.value).toBe("DISABLED");

    account.activate();
    expect(account.status.value).toBe("ACTIVE");
    expect(account.isActive()).toBe(true);
  });

  it("アカウント無効化 -- status を DISABLED に切り替えられること (BR-13)", () => {
    const account = createOwnerAccount();
    account.disable();
    expect(account.status.value).toBe("DISABLED");
    expect(account.isActive()).toBe(false);
  });

  it("updatedAt が状態変更時に更新されること", () => {
    const account = createOwnerAccount();
    const originalUpdatedAt = account.updatedAt;

    // 時間差を確保するために少し待つ
    const before = new Date();
    account.disable();

    expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it("updatedAt がパスワード変更時に更新されること", () => {
    const account = createOwnerAccount();
    const before = new Date();
    const newHash = HashedPassword.create("newpassword1");
    account.changePassword(newHash);

    expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });

  it("同一の ownerId を持つエンティティが reconstruct で復元できること", () => {
    const email = EmailAddress.create("owner@example.com");
    const passwordHash = HashedPassword.create("password123");
    const now = new Date();
    const account = OwnerAccount.reconstruct(
      "owner-id-1",
      email,
      passwordHash,
      AccountStatus.ACTIVE,
      now,
      now,
    );
    expect(account.ownerId).toBe("owner-id-1");
  });

  it("changePassword でパスワードが更新されること (BR-08)", () => {
    const account = createOwnerAccount();
    const newHash = HashedPassword.create("newpassword1");
    account.changePassword(newHash);

    expect(account.verifyPassword("newpassword1")).toBe(true);
    expect(account.verifyPassword("password123")).toBe(false);
  });

  // --- 異常系 ---

  it("誤ったパスワードで認証失敗すること (BR-02)", () => {
    const account = createOwnerAccount();
    expect(account.verifyPassword("wrongpassword")).toBe(false);
  });

  it("無効化されたアカウントでは isActive が false を返すこと (BR-14)", () => {
    const account = createOwnerAccount();
    account.disable();
    expect(account.isActive()).toBe(false);
  });

  // --- 境界値 ---

  it("reconstruct で空文字の ownerId を指定した場合でも生成できること", () => {
    const email = EmailAddress.create("owner@example.com");
    const passwordHash = HashedPassword.create("password123");
    const now = new Date();
    // reconstruct はバリデーションなしで復元するため、空文字でも例外は投げない
    const account = OwnerAccount.reconstruct(
      "",
      email,
      passwordHash,
      AccountStatus.ACTIVE,
      now,
      now,
    );
    expect(account.ownerId).toBe("");
  });
});
