import { describe, it, expect } from "vitest";
import { AdminAccount } from "../src/AdminAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { Role } from "../src/Role";

describe("AdminAccount", () => {
  const createAdminAccount = () => {
    const email = EmailAddress.create("admin@example.com");
    const passwordHash = HashedPassword.create("adminpass1");
    return AdminAccount.create(email, passwordHash);
  };

  // --- 正常系 ---

  it("必要な属性で生成できること", () => {
    const email = EmailAddress.create("admin@example.com");
    const passwordHash = HashedPassword.create("adminpass1");
    const account = AdminAccount.create(email, passwordHash);

    expect(account.adminId).toBeTruthy();
    expect(account.email.equals(email)).toBe(true);
    expect(account.passwordHash.equals(passwordHash)).toBe(true);
    expect(account.role.equals(Role.ADMIN)).toBe(true);
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it("role が admin であること", () => {
    const account = createAdminAccount();
    expect(account.role.value).toBe("admin");
  });

  it("同一の adminId を持つエンティティが reconstruct で復元できること", () => {
    const email = EmailAddress.create("admin@example.com");
    const passwordHash = HashedPassword.create("adminpass1");
    const now = new Date();
    const account = AdminAccount.reconstruct(
      "admin-id-1",
      email,
      passwordHash,
      now,
    );
    expect(account.adminId).toBe("admin-id-1");
  });

  it("正しいパスワードで認証成功すること", () => {
    const account = createAdminAccount();
    expect(account.verifyPassword("adminpass1")).toBe(true);
  });

  it("誤ったパスワードで認証失敗すること", () => {
    const account = createAdminAccount();
    expect(account.verifyPassword("wrongpass123")).toBe(false);
  });

  // --- 異常系 ---

  it("不正なメールアドレスでは AdminAccount を生成できないこと", () => {
    expect(() => {
      const email = EmailAddress.create("invalid-email");
      const passwordHash = HashedPassword.create("adminpass1");
      AdminAccount.create(email, passwordHash);
    }).toThrow();
  });
});
