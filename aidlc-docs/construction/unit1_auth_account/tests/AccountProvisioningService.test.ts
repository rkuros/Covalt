import { describe, it, expect, beforeEach, vi } from "vitest";
import { AccountProvisioningService } from "../src/AccountProvisioningService";
import { InMemoryOwnerAccountRepository } from "../src/InMemoryOwnerAccountRepository";
import { InMemoryPasswordResetTokenRepository } from "../src/InMemoryPasswordResetTokenRepository";
import { EmailGateway } from "../src/EmailGateway";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";

describe("AccountProvisioningService", () => {
  let ownerRepo: InMemoryOwnerAccountRepository;
  let resetTokenRepo: InMemoryPasswordResetTokenRepository;
  let emailGateway: EmailGateway;
  let provisioningService: AccountProvisioningService;

  beforeEach(() => {
    ownerRepo = new InMemoryOwnerAccountRepository();
    resetTokenRepo = new InMemoryPasswordResetTokenRepository();
    emailGateway = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      sendAccountSetupEmail: vi.fn().mockResolvedValue(undefined),
    };
    provisioningService = new AccountProvisioningService(
      ownerRepo,
      resetTokenRepo,
      emailGateway,
    );
  });

  // --- 正常系 ---

  it("オーナーアカウントを作成できること (BR-09)", async () => {
    const account = await provisioningService.provision(
      "newowner@example.com",
    );

    expect(account).toBeTruthy();
    expect(account.ownerId).toBeTruthy();
    expect(account.email.value).toBe("newowner@example.com");
  });

  it("作成されたアカウントの role が owner であること", async () => {
    const account = await provisioningService.provision(
      "newowner@example.com",
    );

    expect(account.role.value).toBe("owner");
  });

  it("作成されたアカウントの status が ACTIVE であること", async () => {
    const account = await provisioningService.provision(
      "newowner@example.com",
    );

    expect(account.status.value).toBe("ACTIVE");
    expect(account.isActive()).toBe(true);
  });

  it("アカウント作成後、初期設定用メールの送信が起動されること (BR-10)", async () => {
    await provisioningService.provision("newowner@example.com");

    expect(emailGateway.sendAccountSetupEmail).toHaveBeenCalledTimes(1);
    expect(emailGateway.sendAccountSetupEmail).toHaveBeenCalledWith(
      "newowner@example.com",
      expect.any(String),
    );
  });

  it("アカウント作成後、初期設定用トークンがリポジトリに保存されること", async () => {
    const account = await provisioningService.provision(
      "newowner@example.com",
    );

    const tokens = await resetTokenRepo.findByOwnerId(account.ownerId);
    expect(tokens.length).toBe(1);
    expect(tokens[0].ownerId).toBe(account.ownerId);
  });

  it("作成されたアカウントがリポジトリに保存されること", async () => {
    const account = await provisioningService.provision(
      "newowner@example.com",
    );

    const found = await ownerRepo.findById(account.ownerId);
    expect(found).not.toBeNull();
    expect(found!.ownerId).toBe(account.ownerId);
  });

  // --- 異常系 ---

  it("既に登録済みのメールアドレスでアカウント作成を試みた場合に失敗すること", async () => {
    // 事前にオーナーアカウントを登録
    const email = EmailAddress.create("existing@example.com");
    const hash = HashedPassword.create("password123");
    const existing = OwnerAccount.create(email, hash);
    await ownerRepo.save(existing);

    await expect(
      provisioningService.provision("existing@example.com"),
    ).rejects.toThrow("このメールアドレスは既に登録されています");
  });

  it("メールアドレスが不正な形式の場合に失敗すること", async () => {
    await expect(
      provisioningService.provision("invalid-email"),
    ).rejects.toThrow("メールアドレスの形式が不正です");
  });

  it("メールアドレスが空の場合に失敗すること", async () => {
    await expect(provisioningService.provision("")).rejects.toThrow();
  });
});
