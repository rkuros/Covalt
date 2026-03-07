import { describe, it, expect, beforeEach } from "vitest";
import {
  TokenVerificationService,
  AuthVerificationError,
} from "../src/TokenVerificationService";
import { InMemoryOwnerAccountRepository } from "../src/InMemoryOwnerAccountRepository";
import { InMemorySessionRepository } from "../src/InMemorySessionRepository";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { Session } from "../src/Session";
import { AuthToken } from "../src/AuthToken";
import { AccountStatus } from "../src/AccountStatus";

describe("TokenVerificationService", () => {
  let ownerRepo: InMemoryOwnerAccountRepository;
  let sessionRepo: InMemorySessionRepository;
  let verificationService: TokenVerificationService;

  beforeEach(() => {
    ownerRepo = new InMemoryOwnerAccountRepository();
    sessionRepo = new InMemorySessionRepository();
    verificationService = new TokenVerificationService(
      sessionRepo,
      ownerRepo,
    );
  });

  const setupActiveOwnerWithSession = async (
    email = "owner@example.com",
  ) => {
    const emailAddress = EmailAddress.create(email);
    const passwordHash = HashedPassword.create("password123");
    const account = OwnerAccount.create(emailAddress, passwordHash);
    await ownerRepo.save(account);

    const session = Session.create(account.ownerId);
    await sessionRepo.save(session);

    return { account, session };
  };

  const setupDisabledOwnerWithSession = async () => {
    const emailAddress = EmailAddress.create("disabled@example.com");
    const passwordHash = HashedPassword.create("password123");
    const account = OwnerAccount.create(emailAddress, passwordHash);
    account.disable();
    await ownerRepo.save(account);

    const session = Session.create(account.ownerId);
    await sessionRepo.save(session);

    return { account, session };
  };

  // --- 正常系 ---

  it("有効なトークンで認証検証が成功し、ownerId, email, role を返すこと (PACT: 200)", async () => {
    const { account, session } = await setupActiveOwnerWithSession();

    const result = await verificationService.verify(session.token.value);

    expect(result.ownerId).toBe(account.ownerId);
    expect(result.email).toBe(account.email.value);
    expect(result.role).toBe("owner");
  });

  it("レスポンスの ownerId が string 型であること (PACT マッチングルール)", async () => {
    const { session } = await setupActiveOwnerWithSession();

    const result = await verificationService.verify(session.token.value);

    expect(typeof result.ownerId).toBe("string");
  });

  it("レスポンスの email が string 型であること (PACT マッチングルール)", async () => {
    const { session } = await setupActiveOwnerWithSession();

    const result = await verificationService.verify(session.token.value);

    expect(typeof result.email).toBe("string");
  });

  it("レスポンスの role が ^(owner|admin)$ にマッチすること (PACT マッチングルール)", async () => {
    const { session } = await setupActiveOwnerWithSession();

    const result = await verificationService.verify(session.token.value);

    expect(result.role).toMatch(/^(owner|admin)$/);
  });

  it("owner アカウントのトークンで検証した場合、role が owner で返ること", async () => {
    const { session } = await setupActiveOwnerWithSession();

    const result = await verificationService.verify(session.token.value);

    expect(result.role).toBe("owner");
  });

  // --- 異常系 ---

  it("無効なトークンで認証検証が失敗し、UNAUTHORIZED エラーが返ること (PACT: 401)", async () => {
    try {
      await verificationService.verify("invalid-token");
      expect.fail("エラーが発生するべきです");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthVerificationError);
      const error = e as AuthVerificationError;
      expect(error.errorCode).toBe("UNAUTHORIZED");
      expect(error.message).toBe("認証トークンが無効です");
    }
  });

  it("無効化されたアカウントのトークンで ACCOUNT_DISABLED エラーが返ること (PACT: 403, BR-14)", async () => {
    const { session } = await setupDisabledOwnerWithSession();

    try {
      await verificationService.verify(session.token.value);
      expect.fail("エラーが発生するべきです");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthVerificationError);
      const error = e as AuthVerificationError;
      expect(error.errorCode).toBe("ACCOUNT_DISABLED");
      expect(error.message).toBe("アカウントが無効化されています");
    }
  });

  it("有効期限切れセッションのトークンで認証検証が失敗すること (BR-05)", async () => {
    const emailAddress = EmailAddress.create("owner@example.com");
    const passwordHash = HashedPassword.create("password123");
    const account = OwnerAccount.create(emailAddress, passwordHash);
    await ownerRepo.save(account);

    const token = AuthToken.create("expired-session-token");
    const past = new Date(Date.now() - 60000);
    const expiredAt = new Date(Date.now() - 1000);
    const expiredSession = Session.reconstruct(
      "expired-session-id",
      account.ownerId,
      token,
      past,
      expiredAt,
    );
    await sessionRepo.save(expiredSession);

    try {
      await verificationService.verify("expired-session-token");
      expect.fail("エラーが発生するべきです");
    } catch (e) {
      expect(e).toBeInstanceOf(AuthVerificationError);
      const error = e as AuthVerificationError;
      expect(error.errorCode).toBe("UNAUTHORIZED");
    }
  });

  it("トークンが空文字の場合にエラーとなること", async () => {
    await expect(verificationService.verify("")).rejects.toThrow();
  });

  it("トークンが空白のみの場合にエラーとなること (Authorization ヘッダー欠落相当)", async () => {
    await expect(verificationService.verify("   ")).rejects.toThrow();
  });

  // --- セキュリティ (CC-02: テナント分離) ---

  it("認証トークン検証で返却される ownerId が該当するオーナーアカウントの ownerId と正確に一致すること", async () => {
    const { account, session } = await setupActiveOwnerWithSession();

    const result = await verificationService.verify(session.token.value);

    expect(result.ownerId).toBe(account.ownerId);
  });

  it("異なるオーナーのトークンではそれぞれ正しい ownerId が返却されること", async () => {
    const { account: owner1, session: session1 } =
      await setupActiveOwnerWithSession("owner1@example.com");
    const { account: owner2, session: session2 } =
      await setupActiveOwnerWithSession("owner2@example.com");

    const result1 = await verificationService.verify(session1.token.value);
    const result2 = await verificationService.verify(session2.token.value);

    expect(result1.ownerId).toBe(owner1.ownerId);
    expect(result2.ownerId).toBe(owner2.ownerId);
    expect(result1.ownerId).not.toBe(result2.ownerId);
  });
});
