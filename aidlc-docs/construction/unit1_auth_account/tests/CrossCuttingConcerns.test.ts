import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TokenVerificationService,
  AuthVerificationError,
} from "../src/TokenVerificationService";
import { OwnerAccountRepository } from "../src/OwnerAccountRepository";
import { SessionRepository } from "../src/SessionRepository";
import { InMemoryOwnerAccountRepository } from "../src/InMemoryOwnerAccountRepository";
import { InMemorySessionRepository } from "../src/InMemorySessionRepository";
import { OwnerAccount } from "../src/OwnerAccount";
import { EmailAddress } from "../src/EmailAddress";
import { HashedPassword } from "../src/HashedPassword";
import { Session } from "../src/Session";
import { AuthToken } from "../src/AuthToken";

/**
 * 横断的関心事テスト
 * CC-01: セキュリティ（HTTPS はインフラ層の責務なのでスコープ外）
 * CC-02: テナント分離
 * CC-04: エラーハンドリング
 */
describe("横断的関心事", () => {
  // --- 5.1 セキュリティ (CC-02: テナント分離) ---

  describe("セキュリティ (CC-02: テナント分離)", () => {
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

    it("認証トークン検証で返却される ownerId が該当するオーナーアカウントの ownerId と正確に一致すること", async () => {
      const email = EmailAddress.create("owner1@example.com");
      const hash = HashedPassword.create("password123");
      const account = OwnerAccount.create(email, hash);
      await ownerRepo.save(account);

      const session = Session.create(account.ownerId);
      await sessionRepo.save(session);

      const result = await verificationService.verify(session.token.value);

      expect(result.ownerId).toBe(account.ownerId);
      expect(result.email).toBe(account.email.value);
    });

    it("異なるオーナーのトークンではそれぞれ正しい ownerId が返却されること", async () => {
      // Owner A
      const emailA = EmailAddress.create("ownerA@example.com");
      const hashA = HashedPassword.create("passwordA1");
      const accountA = OwnerAccount.create(emailA, hashA);
      await ownerRepo.save(accountA);
      const sessionA = Session.create(accountA.ownerId);
      await sessionRepo.save(sessionA);

      // Owner B
      const emailB = EmailAddress.create("ownerB@example.com");
      const hashB = HashedPassword.create("passwordB1");
      const accountB = OwnerAccount.create(emailB, hashB);
      await ownerRepo.save(accountB);
      const sessionB = Session.create(accountB.ownerId);
      await sessionRepo.save(sessionB);

      const resultA = await verificationService.verify(
        sessionA.token.value,
      );
      const resultB = await verificationService.verify(
        sessionB.token.value,
      );

      // それぞれ正しい ownerId が返る
      expect(resultA.ownerId).toBe(accountA.ownerId);
      expect(resultA.email).toBe("ownera@example.com");
      expect(resultB.ownerId).toBe(accountB.ownerId);
      expect(resultB.email).toBe("ownerb@example.com");

      // 異なるオーナー間で混在しない
      expect(resultA.ownerId).not.toBe(resultB.ownerId);
    });
  });

  // --- 5.2 エラーハンドリング (CC-04) ---

  describe("エラーハンドリング (CC-04)", () => {
    it("リポジトリアクセス失敗時に適切なエラーが伝播すること", async () => {
      // findByToken が例外を投げるモックリポジトリ
      const failingSessionRepo: SessionRepository = {
        save: vi.fn(),
        findByToken: vi
          .fn()
          .mockRejectedValue(new Error("DB connection failed")),
        findByOwnerId: vi.fn(),
        deleteByToken: vi.fn(),
        deleteByOwnerId: vi.fn(),
      };

      const failingOwnerRepo: OwnerAccountRepository = {
        save: vi.fn(),
        findById: vi.fn(),
        findByEmail: vi.fn(),
        findAll: vi.fn(),
      };

      const service = new TokenVerificationService(
        failingSessionRepo,
        failingOwnerRepo,
      );

      await expect(
        service.verify("some-token"),
      ).rejects.toThrow("DB connection failed");
    });

    it("OwnerAccountRepository アクセス失敗時にエラーが伝播すること", async () => {
      const ownerRepo = new InMemoryOwnerAccountRepository();
      const sessionRepo = new InMemorySessionRepository();

      // 有効なセッションを登録
      const email = EmailAddress.create("owner@example.com");
      const hash = HashedPassword.create("password123");
      const account = OwnerAccount.create(email, hash);
      await ownerRepo.save(account);
      const session = Session.create(account.ownerId);
      await sessionRepo.save(session);

      // findById が失敗するモック
      const failingOwnerRepo: OwnerAccountRepository = {
        save: vi.fn(),
        findById: vi
          .fn()
          .mockRejectedValue(new Error("DB connection failed")),
        findByEmail: vi.fn(),
        findAll: vi.fn(),
      };

      const service = new TokenVerificationService(
        sessionRepo,
        failingOwnerRepo,
      );

      await expect(
        service.verify(session.token.value),
      ).rejects.toThrow("DB connection failed");
    });
  });
});
