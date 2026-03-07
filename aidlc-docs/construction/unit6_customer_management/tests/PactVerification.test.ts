import { describe, it, expect, beforeEach } from "vitest";
import { CustomerQueryService } from "../src/CustomerQueryService";
import { CustomerCommandService } from "../src/CustomerCommandService";
import {
  CustomerAutoRegistrationHandler,
  LineFriendAddedEvent,
} from "../src/CustomerAutoRegistrationHandler";
import { InMemoryCustomerRepository } from "../src/InMemoryCustomerRepository";
import { Customer } from "../src/Customer";
import { CustomerId } from "../src/CustomerId";
import { OwnerId } from "../src/OwnerId";
import { CustomerName } from "../src/CustomerName";
import { DisplayName } from "../src/DisplayName";
import { LineUserId } from "../src/LineUserId";

// --- Step 6: PACT 整合性テスト（Provider Verification）---

describe("PACT 整合性テスト", () => {
  let repository: InMemoryCustomerRepository;
  let queryService: CustomerQueryService;
  let commandService: CustomerCommandService;
  let handler: CustomerAutoRegistrationHandler;

  const validLineUserId = "U1234567890abcdef1234567890abcdef";
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  beforeEach(() => {
    repository = new InMemoryCustomerRepository();
    queryService = new CustomerQueryService(repository);
    commandService = new CustomerCommandService(repository);
    handler = new CustomerAutoRegistrationHandler(commandService);
  });

  // --- 6-1: unit4-unit6-customer.pact.json ---

  describe("unit4-unit6-customer.pact.json -- Unit 4 (Consumer) vs Unit 6 (Provider)", () => {
    it("Interaction 1: 顧客IDで顧客情報を取得する -- Provider State: 顧客 cust-001 が存在する", async () => {
      // Provider State セットアップ
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: DisplayName.create("Taro"),
        lineUserId: LineUserId.create(validLineUserId),
        isLineLinked: true,
        registeredAt: new Date("2025-01-15T10:30:00.000Z"),
      });
      await repository.save(customer);

      // GET /api/customers/cust-001
      const response = await queryService.findById("cust-001");

      // 200 レスポンスの PACT マッチングルール検証
      expect(response).not.toBeNull();
      expect(typeof response!.customerId).toBe("string");
      expect(typeof response!.ownerId).toBe("string");
      expect(typeof response!.customerName).toBe("string");
      expect(typeof response!.isLineLinked).toBe("boolean");
      // registeredAt は ISO 8601 正規表現に合致
      expect(response!.registeredAt).toMatch(iso8601Pattern);
    });

    it("Interaction 2: 存在しない顧客IDで 404 が返る -- Provider State: 顧客 cust-999 は存在しない", async () => {
      // Provider State: cust-999 は存在しない（リポジトリに登録しない）

      // GET /api/customers/cust-999
      const response = await queryService.findById("cust-999");

      // 404 レスポンス（CUSTOMER_NOT_FOUND）
      expect(response).toBeNull();
    });

    it("Interaction 3: LINE ユーザーIDで顧客を検索する -- Provider State: LINE ユーザーが顧客登録済みである", async () => {
      // Provider State セットアップ
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: DisplayName.create("Taro"),
        lineUserId: LineUserId.create(validLineUserId),
        isLineLinked: true,
        registeredAt: new Date("2025-01-15T10:30:00.000Z"),
      });
      await repository.save(customer);

      // GET /api/customers/by-line-user?ownerId=owner-001&lineUserId=U1234567890abcdef...
      const response = await queryService.findByLineUserId(
        "owner-001",
        validLineUserId
      );

      // 200 レスポンス
      expect(response).not.toBeNull();
      expect(typeof response!.customerId).toBe("string");
      expect(typeof response!.ownerId).toBe("string");
      expect(typeof response!.customerName).toBe("string");
      expect(response!.lineUserId).toBe(validLineUserId);
      expect(response!.isLineLinked).toBe(true);
    });

    it("Interaction 4: 手動予約時に新規顧客を作成する -- Provider State: オーナー owner-001 が存在する", async () => {
      // Provider State: オーナー owner-001 が存在する（ドメインレベルではリポジトリが利用可能であることで暗黙的に充足）

      // POST /api/customers
      const response = await commandService.createManual({
        ownerId: "owner-001",
        customerName: "新規顧客",
      });

      // 201 レスポンスの PACT マッチングルール検証
      expect(typeof response.customerId).toBe("string");
      expect(response.customerId).toMatch(/^cust-/);
      expect(typeof response.ownerId).toBe("string");
      expect(typeof response.customerName).toBe("string");
      // registeredAt は ISO 8601 正規表現に合致
      expect(response.registeredAt).toMatch(iso8601Pattern);
    });

    it("Interaction 5: 顧客名で検索する（手動予約時の顧客選択） -- Provider State: オーナー owner-001 に複数の顧客が存在する", async () => {
      // Provider State セットアップ: 複数の顧客を登録
      const customer1 = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date("2025-01-15T10:30:00.000Z"),
      });
      const customer2 = Customer.reconstruct({
        customerId: CustomerId.create("cust-002"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中花子"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date("2025-01-16T09:00:00.000Z"),
      });
      const customer3 = Customer.reconstruct({
        customerId: CustomerId.create("cust-003"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("山田一郎"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date("2025-01-17T09:00:00.000Z"),
      });
      await repository.save(customer1);
      await repository.save(customer2);
      await repository.save(customer3);

      // GET /api/customers/search?ownerId=owner-001&q=田中
      const response = await queryService.searchByName("owner-001", "田中");

      // PACT マッチングルール: customers 配列の型一致 min: 0、total の整数一致
      expect(Array.isArray(response.customers)).toBe(true);
      expect(typeof response.total).toBe("number");
      expect(Number.isInteger(response.total)).toBe(true);
      expect(response.customers.length).toBeGreaterThanOrEqual(0);
      expect(response.total).toBe(response.customers.length);

      // 各要素の型検証
      for (const customer of response.customers) {
        expect(typeof customer.customerId).toBe("string");
        expect(typeof customer.customerName).toBe("string");
        expect(typeof customer.isLineLinked).toBe("boolean");
      }
    });
  });

  // --- 6-2: unit6-unit2-line-webhook-events.pact.json ---

  describe("unit6-unit2-line-webhook-events.pact.json -- Unit 6 (Consumer) vs Unit 2 (Provider)", () => {
    it("Message 1: LINE 友だち追加イベント - 顧客自動登録に使用", async () => {
      // PACT で定義されたペイロード形式のメッセージ
      const pactPayload: LineFriendAddedEvent = {
        eventType: "line.friend_added",
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Taro Tanaka",
        timestamp: "2025-01-15T10:30:00Z",
      };

      // CustomerAutoRegistrationHandler がメッセージを正常に処理できる
      await expect(handler.handle(pactPayload)).resolves.not.toThrow();
      expect(repository.count()).toBe(1);
    });

    it("Message 1 マッチングルール検証: ペイロードの各フィールドが PACT マッチングルールに合致する", () => {
      const pactPayload: LineFriendAddedEvent = {
        eventType: "line.friend_added",
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Taro Tanaka",
        timestamp: "2025-01-15T10:30:00Z",
      };

      // eventType: 正規表現 ^line\.friend_added$
      expect(pactPayload.eventType).toMatch(/^line\.friend_added$/);

      // lineUserId: 正規表現 ^U[0-9a-f]{32}$
      expect(pactPayload.lineUserId).toMatch(/^U[0-9a-f]{32}$/);

      // timestamp: ISO 8601 正規表現
      expect(pactPayload.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
      );

      // ownerId: 型一致（string）
      expect(typeof pactPayload.ownerId).toBe("string");
      expect(pactPayload.ownerId.length).toBeGreaterThan(0);

      // displayName: 型一致（string）
      expect(typeof pactPayload.displayName).toBe("string");
      expect(pactPayload.displayName.length).toBeGreaterThan(0);
    });
  });
});
