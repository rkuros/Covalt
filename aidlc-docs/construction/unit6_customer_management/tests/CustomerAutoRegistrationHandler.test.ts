import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CustomerAutoRegistrationHandler,
  LineFriendAddedEvent,
} from "../src/CustomerAutoRegistrationHandler";
import { CustomerCommandService } from "../src/CustomerCommandService";
import { InMemoryCustomerRepository } from "../src/InMemoryCustomerRepository";

describe("CustomerAutoRegistrationHandler", () => {
  let repository: InMemoryCustomerRepository;
  let commandService: CustomerCommandService;
  let handler: CustomerAutoRegistrationHandler;

  const validLineUserId = "U1234567890abcdef1234567890abcdef";

  const validEvent: LineFriendAddedEvent = {
    eventType: "line.friend_added",
    ownerId: "owner-001",
    lineUserId: validLineUserId,
    displayName: "Taro Tanaka",
    timestamp: "2025-01-15T10:30:00Z",
  };

  beforeEach(() => {
    repository = new InMemoryCustomerRepository();
    commandService = new CustomerCommandService(repository);
    handler = new CustomerAutoRegistrationHandler(commandService);
  });

  // --- Step 4-1: イベントペイロードの検証 ---

  describe("イベントペイロードの検証", () => {
    it("正常系: 有効な line.friend_added イベントペイロードを受理できる", async () => {
      await expect(handler.handle(validEvent)).resolves.not.toThrow();
      expect(repository.count()).toBe(1);
    });

    it("異常系: eventType が line.friend_added 以外の場合、処理をスキップする", async () => {
      const invalidEvent = {
        ...validEvent,
        eventType: "line.message" as "line.friend_added",
      };

      await handler.handle(invalidEvent);
      expect(repository.count()).toBe(0);
    });

    it("異常系: lineUserId が正規表現 ^U[0-9a-f]{32}$ に合致しない場合エラーになる", async () => {
      const invalidEvent = {
        ...validEvent,
        lineUserId: "INVALID_LINE_USER_ID",
      };

      await expect(handler.handle(invalidEvent)).rejects.toThrow(
        "Invalid LineUserId format"
      );
    });

    it("異常系: 必須フィールド ownerId が欠損している場合エラーになる", async () => {
      const invalidEvent = {
        ...validEvent,
        ownerId: "",
      };

      await expect(handler.handle(invalidEvent)).rejects.toThrow(
        "OwnerId must not be empty"
      );
    });

    it("異常系: 必須フィールド displayName が欠損している場合エラーになる", async () => {
      const invalidEvent = {
        ...validEvent,
        displayName: "",
      };

      await expect(handler.handle(invalidEvent)).rejects.toThrow(
        "DisplayName must not be empty"
      );
    });
  });

  // --- Step 4-2: 新規顧客の自動登録（BR-8）---

  describe("新規顧客の自動登録（BR-8）", () => {
    it("正常系: ownerId + lineUserId の組み合わせで既存顧客が見つからない場合、新規 Customer が作成される", async () => {
      await handler.handle(validEvent);
      expect(repository.count()).toBe(1);
    });

    it("正常系: 自動登録された顧客の customerName には displayName の値が初期値として設定される", async () => {
      await handler.handle(validEvent);

      const customer = await repository.findByOwnerAndLineUserId(
        (await import("../src/OwnerId")).OwnerId.create("owner-001"),
        (await import("../src/LineUserId")).LineUserId.create(validLineUserId)
      );

      expect(customer).not.toBeNull();
      expect(customer!.customerName.value).toBe("Taro Tanaka");
    });

    it("正常系: 自動登録された顧客の isLineLinked は true に設定される", async () => {
      await handler.handle(validEvent);

      const customer = await repository.findByOwnerAndLineUserId(
        (await import("../src/OwnerId")).OwnerId.create("owner-001"),
        (await import("../src/LineUserId")).LineUserId.create(validLineUserId)
      );

      expect(customer).not.toBeNull();
      expect(customer!.isLineLinked).toBe(true);
    });

    it("正常系: 自動登録された顧客の lineUserId にイベントの lineUserId が設定される", async () => {
      await handler.handle(validEvent);

      const customer = await repository.findByOwnerAndLineUserId(
        (await import("../src/OwnerId")).OwnerId.create("owner-001"),
        (await import("../src/LineUserId")).LineUserId.create(validLineUserId)
      );

      expect(customer).not.toBeNull();
      expect(customer!.lineUserId?.value).toBe(validLineUserId);
    });
  });

  // --- Step 4-3: 冪等性の担保（BR-9）---

  describe("冪等性の担保（BR-9）", () => {
    it("正常系: ownerId + lineUserId の組み合わせで既存顧客が見つかる場合、新規登録は行われない", async () => {
      await handler.handle(validEvent);
      await handler.handle(validEvent);

      expect(repository.count()).toBe(1);
    });

    it("正常系: 同一イベントが 2 回連続で処理されても、顧客が 1 件のみ存在する", async () => {
      await handler.handle(validEvent);
      await handler.handle(validEvent);
      await handler.handle(validEvent);

      expect(repository.count()).toBe(1);
    });

    it("正常系: 既存顧客が見つかった場合、既存顧客の情報（customerName 等）は上書きされない", async () => {
      await handler.handle(validEvent);

      // 同じ lineUserId で displayName が異なるイベント
      const secondEvent: LineFriendAddedEvent = {
        ...validEvent,
        displayName: "Different Name",
      };
      await handler.handle(secondEvent);

      const customer = await repository.findByOwnerAndLineUserId(
        (await import("../src/OwnerId")).OwnerId.create("owner-001"),
        (await import("../src/LineUserId")).LineUserId.create(validLineUserId)
      );

      expect(customer!.customerName.value).toBe("Taro Tanaka");
    });

    it("境界値: 同一 lineUserId でも ownerId が異なる場合は別顧客として登録される", async () => {
      await handler.handle(validEvent);

      const differentOwnerEvent: LineFriendAddedEvent = {
        ...validEvent,
        ownerId: "owner-002",
      };
      await handler.handle(differentOwnerEvent);

      expect(repository.count()).toBe(2);
    });
  });

  // --- Step 4-4: リトライ耐性 ---

  describe("リトライ耐性", () => {
    it("正常系: 永続化処理が一時的に失敗した場合、リトライ後に正常に顧客が登録される", async () => {
      let callCount = 0;
      const originalSave = repository.save.bind(repository);
      repository.save = vi.fn(async (customer) => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("Temporary failure");
        }
        return originalSave(customer);
      });

      // 最大3回リトライ（指数バックオフ）のシミュレーション
      let success = false;
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await handler.handle(validEvent);
          success = true;
          break;
        } catch (error) {
          lastError = error as Error;
          // 指数バックオフ: 実際のテストでは待機しない
        }
      }

      expect(success).toBe(true);
      expect(repository.count()).toBe(1);
    });

    it("異常系: リトライ上限に達した場合、エラーがスローされる", async () => {
      repository.save = vi.fn(async () => {
        throw new Error("Persistent failure");
      });

      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await handler.handle(validEvent);
          break;
        } catch (error) {
          lastError = error as Error;
        }
      }

      expect(lastError).not.toBeNull();
      expect(lastError!.message).toBe("Persistent failure");
      expect(repository.count()).toBe(0);
    });
  });
});
