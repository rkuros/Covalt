import { describe, it, expect, beforeEach } from "vitest";
import { AuthenticationService } from "../src/AuthenticationService";
import { InMemoryOwnerAccountRepository } from "../src/InMemoryOwnerAccountRepository";
import { InMemorySessionRepository } from "../src/InMemorySessionRepository";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { AccountStatus } from "../src/AccountStatus";
import { AuthToken } from "../src/AuthToken";

describe("AuthenticationService", () => {
  let ownerRepo: InMemoryOwnerAccountRepository;
  let sessionRepo: InMemorySessionRepository;
  let authService: AuthenticationService;

  beforeEach(() => {
    ownerRepo = new InMemoryOwnerAccountRepository();
    sessionRepo = new InMemorySessionRepository();
    authService = new AuthenticationService(ownerRepo, sessionRepo);
  });

  const registerActiveOwner = async (
    email = "owner@example.com",
    password = "password123",
  ) => {
    const emailAddress = EmailAddress.create(email);
    const passwordHash = HashedPassword.create(password);
    const account = OwnerAccount.create(emailAddress, passwordHash);
    await ownerRepo.save(account);
    return account;
  };

  const registerDisabledOwner = async (
    email = "disabled@example.com",
    password = "password123",
  ) => {
    const emailAddress = EmailAddress.create(email);
    const passwordHash = HashedPassword.create(password);
    const account = OwnerAccount.create(emailAddress, passwordHash);
    account.disable();
    await ownerRepo.save(account);
    return account;
  };

  // --- ログイン認証 ---

  describe("ログイン認証", () => {
    it("正しいメールアドレスとパスワードでログイン成功し、セッションが発行されること (BR-01, BR-03)", async () => {
      await registerActiveOwner();

      const session = await authService.login(
        "owner@example.com",
        "password123",
      );

      expect(session).toBeTruthy();
      expect(session.sessionId).toBeTruthy();
      expect(session.ownerId).toBeTruthy();
    });

    it("発行されたセッションにトークンが含まれること", async () => {
      await registerActiveOwner();

      const session = await authService.login(
        "owner@example.com",
        "password123",
      );

      expect(session.token).toBeTruthy();
      expect(session.token.value.length).toBeGreaterThan(0);
    });

    it("発行されたセッションに適切な有効期限が設定されていること", async () => {
      await registerActiveOwner();
      const before = new Date();

      const session = await authService.login(
        "owner@example.com",
        "password123",
      );

      expect(session.expiresAt.getTime()).toBeGreaterThan(before.getTime());
      expect(session.isValid()).toBe(true);
    });

    it("発行されたセッションがリポジトリに保存されていること", async () => {
      await registerActiveOwner();

      const session = await authService.login(
        "owner@example.com",
        "password123",
      );

      const found = await sessionRepo.findByToken(session.token);
      expect(found).not.toBeNull();
      expect(found!.sessionId).toBe(session.sessionId);
    });

    it("存在しないメールアドレスでログイン失敗すること (BR-02)", async () => {
      await expect(
        authService.login("unknown@example.com", "password123"),
      ).rejects.toThrow("メールアドレスまたはパスワードが正しくありません");
    });

    it("誤ったパスワードでログイン失敗すること (BR-02)", async () => {
      await registerActiveOwner();

      await expect(
        authService.login("owner@example.com", "wrongpassword"),
      ).rejects.toThrow("メールアドレスまたはパスワードが正しくありません");
    });

    it("無効化されたアカウントでログイン失敗すること (BR-14)", async () => {
      await registerDisabledOwner();

      await expect(
        authService.login("disabled@example.com", "password123"),
      ).rejects.toThrow("アカウントが無効化されています");
    });

    it("メールアドレスが空の場合にエラーとなること", async () => {
      await expect(authService.login("", "password123")).rejects.toThrow();
    });

    it("パスワードが空の場合にエラーとなること", async () => {
      await registerActiveOwner();

      await expect(
        authService.login("owner@example.com", ""),
      ).rejects.toThrow();
    });
  });

  // --- ログアウト ---

  describe("ログアウト", () => {
    it("ログアウト操作によりセッションが無効化されること (BR-04)", async () => {
      const account = await registerActiveOwner();
      const session = await authService.login(
        "owner@example.com",
        "password123",
      );

      await authService.logout(session.token.value);

      const found = await sessionRepo.findByToken(session.token);
      expect(found).toBeNull();
    });

    it("存在しないセッション ID でログアウトを試みてもエラーにならないこと", async () => {
      // logout は存在しないトークンでもエラーを投げない（実装上 return する）
      await expect(
        authService.logout("non-existent-token"),
      ).resolves.not.toThrow();
    });
  });
});
