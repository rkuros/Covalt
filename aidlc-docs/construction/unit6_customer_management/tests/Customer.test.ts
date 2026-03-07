import { describe, it, expect } from "vitest";
import { Customer } from "../src/Customer";
import { CustomerId } from "../src/CustomerId";
import { OwnerId } from "../src/OwnerId";
import { CustomerName } from "../src/CustomerName";
import { DisplayName } from "../src/DisplayName";
import { LineUserId } from "../src/LineUserId";

describe("Customer", () => {
  const validLineUserId = "U1234567890abcdef1234567890abcdef";

  // --- Step 2-1: 生成 ---

  describe("生成", () => {
    it("正常系: 全フィールドを指定して Customer を生成できる（reconstruct）", () => {
      const now = new Date();
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: DisplayName.create("Taro"),
        lineUserId: LineUserId.create(validLineUserId),
        isLineLinked: true,
        registeredAt: now,
      });

      expect(customer.customerId.value).toBe("cust-001");
      expect(customer.ownerId.value).toBe("owner-001");
      expect(customer.customerName.value).toBe("田中太郎");
      expect(customer.displayName?.value).toBe("Taro");
      expect(customer.lineUserId?.value).toBe(validLineUserId);
      expect(customer.isLineLinked).toBe(true);
      expect(customer.registeredAt).toBe(now);
    });

    it("正常系: LINE 連携なしの顧客を生成できる（createManual）", () => {
      const customer = Customer.createManual({
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
      });

      expect(customer.displayName).toBeNull();
      expect(customer.lineUserId).toBeNull();
      expect(customer.isLineLinked).toBe(false);
      expect(customer.customerId.value).toMatch(/^cust-/);
      expect(customer.registeredAt).toBeInstanceOf(Date);
    });

    it("正常系: LINE 連携ありの顧客を生成できる（createFromLineFollow）", () => {
      const customer = Customer.createFromLineFollow({
        ownerId: OwnerId.create("owner-001"),
        lineUserId: LineUserId.create(validLineUserId),
        displayName: DisplayName.create("Taro"),
      });

      expect(customer.displayName?.value).toBe("Taro");
      expect(customer.lineUserId?.value).toBe(validLineUserId);
      expect(customer.isLineLinked).toBe(true);
      expect(customer.customerName.value).toBe("Taro");
    });

    it("異常系: 必須フィールド（customerName）が空文字列の場合エラーになる", () => {
      expect(() =>
        Customer.createManual({
          ownerId: OwnerId.create("owner-001"),
          customerName: CustomerName.create(""),
        })
      ).toThrow();
    });

    it("異常系: 必須フィールド（ownerId）が空文字列の場合エラーになる", () => {
      expect(() =>
        Customer.createManual({
          ownerId: OwnerId.create(""),
          customerName: CustomerName.create("田中太郎"),
        })
      ).toThrow();
    });
  });

  // --- Step 2-2: LINE 連携状態の整合性 ---

  describe("LINE 連携状態の整合性", () => {
    it("正常系: lineUserId が設定されている場合、isLineLinked が true である", () => {
      const customer = Customer.createFromLineFollow({
        ownerId: OwnerId.create("owner-001"),
        lineUserId: LineUserId.create(validLineUserId),
        displayName: DisplayName.create("Taro"),
      });

      expect(customer.lineUserId).not.toBeNull();
      expect(customer.isLineLinked).toBe(true);
    });

    it("正常系: lineUserId が null の場合、isLineLinked が false である", () => {
      const customer = Customer.createManual({
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
      });

      expect(customer.lineUserId).toBeNull();
      expect(customer.isLineLinked).toBe(false);
    });

    it("異常系: lineUserId が設定されているのに isLineLinked が false の場合、reconstruct で整合性違反の状態が作れてしまうことを確認する", () => {
      // 注: reconstruct はバリデーションを行わない復元用ファクトリのため、
      // 整合性の保証はファクトリメソッド（createManual / createFromLineFollow）側で担保される。
      // createManual / createFromLineFollow を使う限り、この不整合は発生しない。
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: DisplayName.create("Taro"),
        lineUserId: LineUserId.create(validLineUserId),
        isLineLinked: false, // 整合性違反
        registeredAt: new Date(),
      });

      // reconstruct は DB 復元用のため、バリデーションなしで構築される
      // ファクトリメソッド経由では発生しない組み合わせ
      expect(customer.lineUserId).not.toBeNull();
      expect(customer.isLineLinked).toBe(false);
    });
  });

  // --- Step 2-3: 顧客名の編集（BR-6）---

  describe("顧客名の編集（BR-6）", () => {
    it("正常系: customerName を新しい値に更新できる", () => {
      const customer = Customer.createManual({
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
      });

      customer.changeName(CustomerName.create("山田花子"));
      expect(customer.customerName.value).toBe("山田花子");
    });

    it("異常系: customerName を空文字列に更新しようとするとエラーになる", () => {
      const customer = Customer.createManual({
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
      });

      expect(() => customer.changeName(CustomerName.create(""))).toThrow(
        "CustomerName must not be empty"
      );
    });
  });

  // --- Step 2-4: 等価性・識別 ---

  describe("等価性・識別", () => {
    it("正常系: 同じ customerId を持つ 2 つの Customer は等価と判定される", () => {
      const customer1 = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date(),
      });

      const customer2 = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-002"),
        customerName: CustomerName.create("山田花子"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date(),
      });

      expect(customer1.customerId.equals(customer2.customerId)).toBe(true);
    });

    it("正常系: 異なる customerId を持つ 2 つの Customer は等価でないと判定される", () => {
      const customer1 = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date(),
      });

      const customer2 = Customer.reconstruct({
        customerId: CustomerId.create("cust-002"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date(),
      });

      expect(customer1.customerId.equals(customer2.customerId)).toBe(false);
    });
  });

  // --- toResponse / toSearchResult ---

  describe("toResponse", () => {
    it("全フィールドを含むレスポンスオブジェクトが返される", () => {
      const now = new Date("2025-01-15T10:30:00.000Z");
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: DisplayName.create("Taro"),
        lineUserId: LineUserId.create(validLineUserId),
        isLineLinked: true,
        registeredAt: now,
      });

      const response = customer.toResponse();
      expect(response).toEqual({
        customerId: "cust-001",
        ownerId: "owner-001",
        customerName: "田中太郎",
        displayName: "Taro",
        lineUserId: validLineUserId,
        isLineLinked: true,
        registeredAt: "2025-01-15T10:30:00Z",
      });
    });

    it("LINE 連携なしの顧客の場合 displayName と lineUserId が null になる", () => {
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-002"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("山田花子"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date("2025-01-15T10:30:00.000Z"),
      });

      const response = customer.toResponse();
      expect(response.displayName).toBeNull();
      expect(response.lineUserId).toBeNull();
      expect(response.isLineLinked).toBe(false);
    });
  });

  describe("toSearchResult", () => {
    it("検索結果用のサマリ表現が返される", () => {
      const customer = Customer.reconstruct({
        customerId: CustomerId.create("cust-001"),
        ownerId: OwnerId.create("owner-001"),
        customerName: CustomerName.create("田中太郎"),
        displayName: null,
        lineUserId: null,
        isLineLinked: false,
        registeredAt: new Date(),
      });

      const result = customer.toSearchResult();
      expect(result).toEqual({
        customerId: "cust-001",
        customerName: "田中太郎",
        isLineLinked: false,
      });
    });
  });
});
