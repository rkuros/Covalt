import { describe, it, expect, beforeEach, vi } from "vitest";
import { PasswordResetService } from "../src/PasswordResetService";
import { InMemoryOwnerAccountRepository } from "../src/InMemoryOwnerAccountRepository";
import { InMemoryPasswordResetTokenRepository } from "../src/InMemoryPasswordResetTokenRepository";
import { EmailGateway } from "../src/EmailGateway";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { PasswordResetToken } from "../src/PasswordResetToken";
import { AuthToken } from "../src/AuthToken";

describe("PasswordResetService", () => {
  let ownerRepo: InMemoryOwnerAccountRepository;
  let resetTokenRepo: InMemoryPasswordResetTokenRepository;
  let emailGateway: EmailGateway;
  let resetService: PasswordResetService;

  beforeEach(() => {
    ownerRepo = new InMemoryOwnerAccountRepository();
    resetTokenRepo = new InMemoryPasswordResetTokenRepository();
    emailGateway = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      sendAccountSetupEmail: vi.fn().mockResolvedValue(undefined),
    };
    resetService = new PasswordResetService(
      ownerRepo,
      resetTokenRepo,
      emailGateway,
    );
  });

  const registerOwner = async (
    email = "owner@example.com",
    password = "password123",
  ) => {
    const emailAddress = EmailAddress.create(email);
    const passwordHash = HashedPassword.create(password);
    const account = OwnerAccount.create(emailAddress, passwordHash);
    await ownerRepo.save(account);
    return account;
  };

  // --- リセットトークン生成・メール送信起動 ---

  describe("リセットトークン生成・メール送信起動", () => {
    it("登録済みメールアドレスに対してリセットトークンが生成されること (BR-06)", async () => {
      const account = await registerOwner();

      await resetService.requestReset("owner@example.com");

      const tokens = await resetTokenRepo.findByOwnerId(account.ownerId);
      expect(tokens.length).toBe(1);
      expect(tokens[0].ownerId).toBe(account.ownerId);
    });

    it("リセットトークンに有効期限が設定されること (BR-07)", async () => {
      const account = await registerOwner();

      await resetService.requestReset("owner@example.com");

      const tokens = await resetTokenRepo.findByOwnerId(account.ownerId);
      expect(tokens[0].expiresAt).toBeInstanceOf(Date);
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("メール送信基盤への送信起動が行われること (BR-06)", async () => {
      await registerOwner();

      await resetService.requestReset("owner@example.com");

      expect(emailGateway.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(emailGateway.sendPasswordResetEmail).toHaveBeenCalledWith(
        "owner@example.com",
        expect.any(String),
      );
    });

    it("未登録のメールアドレスに対してエラーを返さないこと（セキュリティ考慮）", async () => {
      await expect(
        resetService.requestReset("unknown@example.com"),
      ).resolves.not.toThrow();

      // メール送信は行われない
      expect(emailGateway.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // --- リセットトークン検証・パスワード変更 ---

  describe("リセットトークン検証・パスワード変更", () => {
    it("有効なリセットトークンで新しいパスワードを設定できること (BR-08)", async () => {
      const account = await registerOwner();
      await resetService.requestReset("owner@example.com");

      const tokens = await resetTokenRepo.findByOwnerId(account.ownerId);
      const tokenValue = tokens[0].token.value;

      await resetService.resetPassword(tokenValue, "newpassword1");

      const updatedAccount = await ownerRepo.findById(account.ownerId);
      expect(updatedAccount!.verifyPassword("newpassword1")).toBe(true);
      expect(updatedAccount!.verifyPassword("password123")).toBe(false);
    });

    it("パスワード変更後、リセットトークンが使用済みになること（ワンタイム性）", async () => {
      const account = await registerOwner();
      await resetService.requestReset("owner@example.com");

      const tokens = await resetTokenRepo.findByOwnerId(account.ownerId);
      const tokenValue = tokens[0].token.value;

      await resetService.resetPassword(tokenValue, "newpassword1");

      const updatedTokens = await resetTokenRepo.findByOwnerId(
        account.ownerId,
      );
      expect(updatedTokens[0].usedAt).not.toBeNull();
      expect(updatedTokens[0].isValid()).toBe(false);
    });

    it("有効期限切れのリセットトークンでパスワード変更に失敗すること (BR-07)", async () => {
      const account = await registerOwner();

      // 期限切れトークンを直接作成
      const token = AuthToken.create("expired-reset-token");
      const pastDate = new Date(Date.now() - 1000);
      const expiredResetToken = PasswordResetToken.reconstruct(
        "token-id-expired",
        account.ownerId,
        token,
        pastDate,
        null,
      );
      await resetTokenRepo.save(expiredResetToken);

      await expect(
        resetService.resetPassword("expired-reset-token", "newpassword1"),
      ).rejects.toThrow("リセットトークンが無効または期限切れです");
    });

    it("使用済みのリセットトークンでパスワード変更に失敗すること", async () => {
      const account = await registerOwner();

      const token = AuthToken.create("used-reset-token");
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const usedResetToken = PasswordResetToken.reconstruct(
        "token-id-used",
        account.ownerId,
        token,
        futureDate,
        new Date(), // usedAt が設定済み
      );
      await resetTokenRepo.save(usedResetToken);

      await expect(
        resetService.resetPassword("used-reset-token", "newpassword1"),
      ).rejects.toThrow("リセットトークンが無効または期限切れです");
    });

    it("存在しないリセットトークンでパスワード変更に失敗すること", async () => {
      await expect(
        resetService.resetPassword("non-existent-token", "newpassword1"),
      ).rejects.toThrow("リセットトークンが見つかりません");
    });

    it("パスワードポリシー違反（8文字未満）でパスワード変更に失敗すること", async () => {
      const account = await registerOwner();
      await resetService.requestReset("owner@example.com");

      const tokens = await resetTokenRepo.findByOwnerId(account.ownerId);
      const tokenValue = tokens[0].token.value;

      await expect(
        resetService.resetPassword(tokenValue, "short"),
      ).rejects.toThrow("パスワードは8文字以上である必要があります");
    });
  });
});
