import { describe, it, expect, beforeEach } from "vitest";
import { CustomerCommandService } from "../src/CustomerCommandService";
import { InMemoryCustomerRepository } from "../src/InMemoryCustomerRepository";

describe("CustomerCommandService", () => {
  let repository: InMemoryCustomerRepository;
  let service: CustomerCommandService;

  beforeEach(() => {
    repository = new InMemoryCustomerRepository();
    service = new CustomerCommandService(repository);
  });

  const validLineUserId = "U1234567890abcdef1234567890abcdef";

  // --- Step 3-1: 顧客の手動作成（BR-7 / POST /api/customers）---

  describe("顧客の手動作成（BR-7）", () => {
    it("正常系: ownerId と customerName を指定して顧客を手動作成できる", async () => {
      const response = await service.createManual({
        ownerId: "owner-001",
        customerName: "田中太郎",
      });

      expect(response.ownerId).toBe("owner-001");
      expect(response.customerName).toBe("田中太郎");
    });

    it("正常系: 手動作成した顧客は isLineLinked = false、displayName = null、lineUserId = null で登録される", async () => {
      const response = await service.createManual({
        ownerId: "owner-001",
        customerName: "田中太郎",
      });

      expect(response.isLineLinked).toBe(false);
      expect(response.displayName).toBeNull();
      expect(response.lineUserId).toBeNull();
    });

    it("正常系: 作成された顧客に customerId が自動採番される", async () => {
      const response = await service.createManual({
        ownerId: "owner-001",
        customerName: "田中太郎",
      });

      expect(response.customerId).toBeDefined();
      expect(response.customerId).toMatch(/^cust-/);
    });

    it("正常系: registeredAt に作成日時が設定される", async () => {
      const before = new Date();
      const response = await service.createManual({
        ownerId: "owner-001",
        customerName: "田中太郎",
      });
      const after = new Date();

      const registeredAt = new Date(response.registeredAt);
      // registeredAt は秒精度の ISO 文字列にフォーマットされる場合があるため、
      // before を秒単位に切り捨てて比較する
      const beforeTruncated = new Date(Math.floor(before.getTime() / 1000) * 1000);
      expect(registeredAt.getTime()).toBeGreaterThanOrEqual(beforeTruncated.getTime());
      expect(registeredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it("異常系: ownerId が未指定（空文字列）の場合エラーになる", async () => {
      await expect(
        service.createManual({
          ownerId: "",
          customerName: "田中太郎",
        })
      ).rejects.toThrow("OwnerId must not be empty");
    });

    it("異常系: customerName が未指定（空文字列）の場合エラーになる", async () => {
      await expect(
        service.createManual({
          ownerId: "owner-001",
          customerName: "",
        })
      ).rejects.toThrow("CustomerName must not be empty");
    });

    it("異常系: customerName が空白のみの場合エラーになる", async () => {
      await expect(
        service.createManual({
          ownerId: "owner-001",
          customerName: "   ",
        })
      ).rejects.toThrow("CustomerName must not be empty");
    });
  });

  // --- Step 3-2: 顧客情報の編集（BR-6）---

  describe("顧客情報の編集（BR-6）", () => {
    it("正常系: 既存顧客の customerName を更新できる", async () => {
      const created = await service.createManual({
        ownerId: "owner-001",
        customerName: "田中太郎",
      });

      const updated = await service.updateName(
        created.customerId,
        "田中次郎"
      );

      expect(updated).not.toBeNull();
      expect(updated!.customerName).toBe("田中次郎");
    });

    it("異常系: 存在しない customerId を指定した場合 null が返される", async () => {
      const result = await service.updateName("cust-nonexistent", "新しい名前");
      expect(result).toBeNull();
    });

    it("異常系: 更新後の customerName が空文字列の場合エラーになる", async () => {
      const created = await service.createManual({
        ownerId: "owner-001",
        customerName: "田中太郎",
      });

      await expect(
        service.updateName(created.customerId, "")
      ).rejects.toThrow("CustomerName must not be empty");
    });
  });

  // --- createFromLineFollow（BR-8, BR-9 -- コマンドサービス経由の冪等性）---

  describe("LINE 友だち追加による顧客作成", () => {
    it("正常系: 新規顧客が作成される", async () => {
      const response = await service.createFromLineFollow({
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Taro",
      });

      expect(response.ownerId).toBe("owner-001");
      expect(response.lineUserId).toBe(validLineUserId);
      expect(response.displayName).toBe("Taro");
      expect(response.customerName).toBe("Taro");
      expect(response.isLineLinked).toBe(true);
    });

    it("正常系: 冪等性 -- 同一 ownerId + lineUserId の場合、既存顧客が返される", async () => {
      const first = await service.createFromLineFollow({
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Taro",
      });

      const second = await service.createFromLineFollow({
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Taro Updated",
      });

      expect(second.customerId).toBe(first.customerId);
      expect(repository.count()).toBe(1);
    });

    it("正常系: 既存顧客が見つかった場合、customerName は上書きされない", async () => {
      const first = await service.createFromLineFollow({
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Taro",
      });

      const second = await service.createFromLineFollow({
        ownerId: "owner-001",
        lineUserId: validLineUserId,
        displayName: "Different Name",
      });

      expect(second.customerName).toBe(first.customerName);
    });
  });
});
