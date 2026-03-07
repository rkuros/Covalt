import { describe, it, expect, beforeEach } from "vitest";
import { AccountManagementService } from "../src/AccountManagementService";
import { InMemoryOwnerAccountRepository } from "../src/InMemoryOwnerAccountRepository";
import { InMemorySessionRepository } from "../src/InMemorySessionRepository";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { Session } from "../src/Session";

describe("AccountManagementService", () => {
  let ownerRepo: InMemoryOwnerAccountRepository;
  let sessionRepo: InMemorySessionRepository;
  let managementService: AccountManagementService;

  beforeEach(() => {
    ownerRepo = new InMemoryOwnerAccountRepository();
    sessionRepo = new InMemorySessionRepository();
    managementService = new AccountManagementService(ownerRepo, sessionRepo);
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

  // --- 正常系 ---

  it("オーナーアカウントの一覧を取得できること (BR-12)", async () => {
    await registerOwner("owner1@example.com");
    await registerOwner("owner2@example.com");
    await registerOwner("owner3@example.com");

    const accounts = await managementService.listAccounts();

    expect(accounts.length).toBe(3);
  });

  it("一覧に各アカウントの status が含まれること", async () => {
    const account1 = await registerOwner("owner1@example.com");
    const account2 = await registerOwner("owner2@example.com");
    account2.disable();
    await ownerRepo.save(account2);

    const accounts = await managementService.listAccounts();

    const statuses = accounts.map((a) => a.status.value);
    expect(statuses).toContain("ACTIVE");
    expect(statuses).toContain("DISABLED");
  });

  it("アカウント数が 0 の場合は空配列を返すこと", async () => {
    const accounts = await managementService.listAccounts();
    expect(accounts).toEqual([]);
  });

  it("アカウントを ACTIVE から DISABLED に切り替えられること (BR-13)", async () => {
    const account = await registerOwner();
    expect(account.isActive()).toBe(true);

    await managementService.disableAccount(account.ownerId);

    const updated = await ownerRepo.findById(account.ownerId);
    expect(updated!.status.value).toBe("DISABLED");
    expect(updated!.isActive()).toBe(false);
  });

  it("アカウントを DISABLED から ACTIVE に切り替えられること (BR-13)", async () => {
    const account = await registerOwner();
    account.disable();
    await ownerRepo.save(account);

    await managementService.activateAccount(account.ownerId);

    const updated = await ownerRepo.findById(account.ownerId);
    expect(updated!.status.value).toBe("ACTIVE");
    expect(updated!.isActive()).toBe(true);
  });

  it("アカウント無効化時に既存セッションが即座に削除されること (BR-14)", async () => {
    const account = await registerOwner();

    // セッションを作成
    const session1 = Session.create(account.ownerId);
    const session2 = Session.create(account.ownerId);
    await sessionRepo.save(session1);
    await sessionRepo.save(session2);

    // セッションが存在することを確認
    const sessionsBefore = await sessionRepo.findByOwnerId(account.ownerId);
    expect(sessionsBefore.length).toBe(2);

    // アカウントを無効化
    await managementService.disableAccount(account.ownerId);

    // セッションが削除されたことを確認
    const sessionsAfter = await sessionRepo.findByOwnerId(account.ownerId);
    expect(sessionsAfter.length).toBe(0);
  });

  // --- 異常系 ---

  it("存在しない ownerId のアカウント有効化に失敗すること", async () => {
    await expect(
      managementService.activateAccount("non-existent-id"),
    ).rejects.toThrow("アカウントが見つかりません");
  });

  it("存在しない ownerId のアカウント無効化に失敗すること", async () => {
    await expect(
      managementService.disableAccount("non-existent-id"),
    ).rejects.toThrow("アカウントが見つかりません");
  });
});
