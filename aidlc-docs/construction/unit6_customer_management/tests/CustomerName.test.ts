import { describe, it, expect } from "vitest";
import { CustomerName } from "../src/CustomerName";

describe("CustomerName", () => {
  // Step 1-5

  it("正常系: 有効な文字列で CustomerName を生成できる", () => {
    const name = CustomerName.create("田中太郎");
    expect(name.value).toBe("田中太郎");
  });

  it("異常系: 空文字列で CustomerName を生成しようとするとエラーになる", () => {
    expect(() => CustomerName.create("")).toThrow(
      "CustomerName must not be empty"
    );
  });

  it("異常系: null で CustomerName を生成しようとするとエラーになる", () => {
    expect(() => CustomerName.create(null as unknown as string)).toThrow(
      "CustomerName must not be empty"
    );
  });

  it("異常系: undefined で CustomerName を生成しようとするとエラーになる", () => {
    expect(() => CustomerName.create(undefined as unknown as string)).toThrow(
      "CustomerName must not be empty"
    );
  });

  it("equals() で同じ値を持つ CustomerName は等価と判定される", () => {
    const name1 = CustomerName.create("田中太郎");
    const name2 = CustomerName.create("田中太郎");
    expect(name1.equals(name2)).toBe(true);
  });

  it("equals() で異なる値を持つ CustomerName は等価でないと判定される", () => {
    const name1 = CustomerName.create("田中太郎");
    const name2 = CustomerName.create("山田花子");
    expect(name1.equals(name2)).toBe(false);
  });

  it("toString() で値が文字列として返される", () => {
    const name = CustomerName.create("田中太郎");
    expect(name.toString()).toBe("田中太郎");
  });
});
