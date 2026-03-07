import { describe, it, expect } from "vitest";
import { CustomerId } from "../src/CustomerId";

describe("CustomerId", () => {
  // Step 1-1

  it("正常系: 有効な文字列で CustomerId を生成できる", () => {
    const id = CustomerId.create("cust-001");
    expect(id.value).toBe("cust-001");
  });

  it("異常系: 空文字列で CustomerId を生成しようとするとエラーになる", () => {
    expect(() => CustomerId.create("")).toThrow("CustomerId must not be empty");
  });

  it("異常系: null で CustomerId を生成しようとするとエラーになる", () => {
    expect(() => CustomerId.create(null as unknown as string)).toThrow(
      "CustomerId must not be empty"
    );
  });

  it("異常系: undefined で CustomerId を生成しようとするとエラーになる", () => {
    expect(() => CustomerId.create(undefined as unknown as string)).toThrow(
      "CustomerId must not be empty"
    );
  });

  it("generate() で一意な CustomerId が自動採番される", () => {
    const id1 = CustomerId.generate();
    const id2 = CustomerId.generate();
    expect(id1.value).toMatch(/^cust-/);
    expect(id2.value).toMatch(/^cust-/);
    expect(id1.equals(id2)).toBe(false);
  });

  it("equals() で同じ値を持つ CustomerId は等価と判定される", () => {
    const id1 = CustomerId.create("cust-001");
    const id2 = CustomerId.create("cust-001");
    expect(id1.equals(id2)).toBe(true);
  });

  it("equals() で異なる値を持つ CustomerId は等価でないと判定される", () => {
    const id1 = CustomerId.create("cust-001");
    const id2 = CustomerId.create("cust-002");
    expect(id1.equals(id2)).toBe(false);
  });

  it("toString() で値が文字列として返される", () => {
    const id = CustomerId.create("cust-001");
    expect(id.toString()).toBe("cust-001");
  });
});
