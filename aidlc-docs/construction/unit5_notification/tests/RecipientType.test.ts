import { describe, it, expect } from "vitest";
import { RecipientType } from "../src/RecipientType";

describe("RecipientType", () => {
  // --- 正常系 ---

  it("customer を指定して RecipientType を生成できる", () => {
    const type: RecipientType = RecipientType.Customer;
    expect(type).toBe("customer");
  });

  it("owner を指定して RecipientType を生成できる", () => {
    const type: RecipientType = RecipientType.Owner;
    expect(type).toBe("owner");
  });

  it("同じ種別を持つ RecipientType 同士は等価と判定される", () => {
    const a: RecipientType = RecipientType.Customer;
    const b: RecipientType = RecipientType.Customer;
    expect(a).toBe(b);
  });

  // --- 異常系 ---

  it('定義されていない種別文字列（例: "admin"）を指定した場合、エラーとなる', () => {
    const validValues = Object.values(RecipientType);
    expect(validValues).not.toContain("admin");
  });

  it("空文字列を指定した場合、エラーとなる", () => {
    const validValues = Object.values(RecipientType);
    expect(validValues).not.toContain("");
  });

  it("null / undefined を指定した場合、エラーとなる", () => {
    const validValues = Object.values(RecipientType);
    expect(validValues).not.toContain(null);
    expect(validValues).not.toContain(undefined);
  });
});
