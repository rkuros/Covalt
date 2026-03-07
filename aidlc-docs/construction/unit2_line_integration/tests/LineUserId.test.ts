import { describe, it, expect } from "vitest";
import { LineUserId } from "../src/LineUserId";

describe("LineUserId", () => {
  // --- 正常系 ---

  it("U + 32桁の16進数文字列で正しく生成できること", () => {
    const userId = LineUserId.create("U1234567890abcdef1234567890abcdef");
    expect(userId).toBeDefined();
  });

  it("小文字の16進数文字列(a-f)で生成できること", () => {
    const userId = LineUserId.create("Uabcdefabcdefabcdefabcdefabcdefab");
    expect(userId).toBeDefined();
  });

  it("生成後の value プロパティが入力値と一致すること", () => {
    const input = "U1234567890abcdef1234567890abcdef";
    const userId = LineUserId.create(input);
    expect(userId.value).toBe(input);
  });

  it("同じ値を持つ2つの LineUserId が等価であること", () => {
    const a = LineUserId.create("U1234567890abcdef1234567890abcdef");
    const b = LineUserId.create("U1234567890abcdef1234567890abcdef");
    expect(a.equals(b)).toBe(true);
  });

  it("異なる値を持つ2つの LineUserId が等価でないこと", () => {
    const a = LineUserId.create("U1234567890abcdef1234567890abcdef");
    const b = LineUserId.create("Uabcdefabcdefabcdefabcdefabcdefab");
    expect(a.equals(b)).toBe(false);
  });

  it("toString() が value と同じ文字列を返すこと", () => {
    const userId = LineUserId.create("U1234567890abcdef1234567890abcdef");
    expect(userId.toString()).toBe("U1234567890abcdef1234567890abcdef");
  });

  // --- 異常系 ---

  it("空文字列で生成するとバリデーションエラーになること", () => {
    expect(() => LineUserId.create("")).toThrow();
  });

  it("U プレフィックスがない文字列で生成するとバリデーションエラーになること", () => {
    expect(() => LineUserId.create("1234567890abcdef1234567890abcdef")).toThrow();
  });

  it("U + 31桁の16進数文字列(桁数不足)で生成するとバリデーションエラーになること", () => {
    expect(() => LineUserId.create("U1234567890abcdef1234567890abcde")).toThrow();
  });

  it("U + 33桁の16進数文字列(桁数超過)で生成するとバリデーションエラーになること", () => {
    expect(() =>
      LineUserId.create("U1234567890abcdef1234567890abcdefa"),
    ).toThrow();
  });

  it("大文字の16進数文字列で生成するとバリデーションエラーになること", () => {
    expect(() =>
      LineUserId.create("U1234567890ABCDEF1234567890ABCDEF"),
    ).toThrow();
  });

  it("16進数以外の文字を含む文字列で生成するとバリデーションエラーになること", () => {
    expect(() =>
      LineUserId.create("U1234567890abcdef1234567890abcdeg"),
    ).toThrow();
  });

  it("null で生成するとバリデーションエラーになること", () => {
    expect(() => LineUserId.create(null as unknown as string)).toThrow();
  });

  it("undefined で生成するとバリデーションエラーになること", () => {
    expect(() => LineUserId.create(undefined as unknown as string)).toThrow();
  });

  // --- 境界値 ---

  it("U + 32桁の 0 のみで生成できること", () => {
    const userId = LineUserId.create("U00000000000000000000000000000000");
    expect(userId.value).toBe("U00000000000000000000000000000000");
  });

  it("U + 32桁の f のみで生成できること", () => {
    const userId = LineUserId.create("Uffffffffffffffffffffffffffffffff");
    expect(userId.value).toBe("Uffffffffffffffffffffffffffffffff");
  });
});
