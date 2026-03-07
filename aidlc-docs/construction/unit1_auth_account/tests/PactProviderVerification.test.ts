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

/**
 * PACT 契約準拠テスト (Provider Verification)
 * 対象契約: unit4-unit1-auth.pact.json（Unit 3, 4, 6, 7 共通）
 */
describe("PACT Provider Verification", () => {
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

  // --- 4.1 Provider State: 「有効なオーナーアカウントが存在する」 ---

  describe("Provider State: 有効なオーナーアカウントが存在する", () => {
    let session: Session;

    beforeEach(async () => {
      const emailAddress = EmailAddress.create("owner@example.com");
      const passwordHash = HashedPassword.create("password123");
      const account = OwnerAccount.create(emailAddress, passwordHash);
      await ownerRepo.save(account);

      // valid-token-12345 に対応するセッションを作成
      const token = AuthToken.create("valid-token-12345");
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      session = Session.reconstruct(
        "session-id-1",
        account.ownerId,
        token,
        now,
        expiresAt,
      );
      await sessionRepo.save(session);
    });

    it("Bearer valid-token-12345 で POST /api/auth/verify にリクエストすると、認証成功すること（ステータス 200 相当）", async () => {
      const result =
        await verificationService.verify("valid-token-12345");

      expect(result).toBeTruthy();
    });

    it("レスポンスボディに ownerId(string), email(string), role(^(owner|admin)$) が含まれること", async () => {
      const result =
        await verificationService.verify("valid-token-12345");

      expect(typeof result.ownerId).toBe("string");
      expect(result.ownerId.length).toBeGreaterThan(0);
      expect(typeof result.email).toBe("string");
      expect(result.email.length).toBeGreaterThan(0);
      expect(result.role).toMatch(/^(owner|admin)$/);
    });

    it("レスポンスの構造が PACT 契約に準拠していること (Content-Type: application/json 相当)", async () => {
      const result =
        await verificationService.verify("valid-token-12345");

      // JSON シリアライズ可能であることを確認
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty("ownerId");
      expect(parsed).toHaveProperty("email");
      expect(parsed).toHaveProperty("role");
    });
  });

  // --- 4.2 Provider State: 「トークンが無効である」 ---

  describe("Provider State: トークンが無効である", () => {
    it("Bearer invalid-token で POST /api/auth/verify にリクエストすると、UNAUTHORIZED エラーが返ること（ステータス 401 相当）", async () => {
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

    it("レスポンスボディに error: UNAUTHORIZED, message: 認証トークンが無効です が含まれること", async () => {
      try {
        await verificationService.verify("invalid-token");
        expect.fail("エラーが発生するべきです");
      } catch (e) {
        const error = e as AuthVerificationError;
        expect(error.errorCode).toBe("UNAUTHORIZED");
        expect(error.message).toBe("認証トークンが無効です");
      }
    });
  });

  // --- 4.3 Provider State: 「アカウントが無効化されている」 ---

  describe("Provider State: アカウントが無効化されている", () => {
    beforeEach(async () => {
      const emailAddress = EmailAddress.create("disabled@example.com");
      const passwordHash = HashedPassword.create("password123");
      const account = OwnerAccount.create(emailAddress, passwordHash);
      account.disable();
      await ownerRepo.save(account);

      // valid-token-disabled に対応するセッションを作成
      const token = AuthToken.create("valid-token-disabled");
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const session = Session.reconstruct(
        "session-id-disabled",
        account.ownerId,
        token,
        now,
        expiresAt,
      );
      await sessionRepo.save(session);
    });

    it("Bearer valid-token-disabled で POST /api/auth/verify にリクエストすると、ACCOUNT_DISABLED エラーが返ること（ステータス 403 相当）", async () => {
      try {
        await verificationService.verify("valid-token-disabled");
        expect.fail("エラーが発生するべきです");
      } catch (e) {
        expect(e).toBeInstanceOf(AuthVerificationError);
        const error = e as AuthVerificationError;
        expect(error.errorCode).toBe("ACCOUNT_DISABLED");
        expect(error.message).toBe("アカウントが無効化されています");
      }
    });

    it("レスポンスボディに error: ACCOUNT_DISABLED, message: アカウントが無効化されています が含まれること", async () => {
      try {
        await verificationService.verify("valid-token-disabled");
        expect.fail("エラーが発生するべきです");
      } catch (e) {
        const error = e as AuthVerificationError;
        expect(error.errorCode).toBe("ACCOUNT_DISABLED");
        expect(error.message).toBe("アカウントが無効化されています");
      }
    });
  });
});
