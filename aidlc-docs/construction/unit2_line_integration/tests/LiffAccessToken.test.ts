import { describe, it, expect } from "vitest";
import { LiffAccessToken } from "../src/LiffAccessToken";

describe("LiffAccessToken", () => {
  // --- 正常系 ---

  it("任意の文字列でトークンを生成できること", () => {
    const token = LiffAccessToken.create("some-valid-token-string");
    expect(token).toBeDefined();
  });

  it("生成後の value プロパティが入力値と一致すること", () => {
    const input = "eyJhbGciOiJIUzI1NiJ9.test-token";
    const token = LiffAccessToken.create(input);
    expect(token.value).toBe(input);
  });

  it("同じ値を持つ2つの LiffAccessToken が等価であること", () => {
    const a = LiffAccessToken.create("token-abc");
    const b = LiffAccessToken.create("token-abc");
    expect(a.equals(b)).toBe(true);
  });

  it("異なる値を持つ2つの LiffAccessToken が等価でないこと", () => {
    const a = LiffAccessToken.create("token-abc");
    const b = LiffAccessToken.create("token-xyz");
    expect(a.equals(b)).toBe(false);
  });

  it("toString() が value と同じ文字列を返すこと", () => {
    const token = LiffAccessToken.create("token-abc");
    expect(token.toString()).toBe("token-abc");
  });

  // --- 異常系 ---

  it("空文字列で生成するとバリデーションエラーになること", () => {
    expect(() => LiffAccessToken.create("")).toThrow(
      "LiffAccessToken must not be empty",
    );
  });

  it("空白文字のみで生成するとバリデーションエラーになること", () => {
    expect(() => LiffAccessToken.create("   ")).toThrow(
      "LiffAccessToken must not be empty",
    );
  });

  it("null で生成するとバリデーションエラーになること", () => {
    expect(() =>
      LiffAccessToken.create(null as unknown as string),
    ).toThrow();
  });

  it("undefined で生成するとバリデーションエラーになること", () => {
    expect(() =>
      LiffAccessToken.create(undefined as unknown as string),
    ).toThrow();
  });

  // --- 境界値 ---

  it("1文字のトークン文字列で生成できること", () => {
    const token = LiffAccessToken.create("a");
    expect(token.value).toBe("a");
  });

  it("非常に長いトークン文字列(1000文字)で生成できること", () => {
    const longToken = "x".repeat(1000);
    const token = LiffAccessToken.create(longToken);
    expect(token.value).toBe(longToken);
    expect(token.value.length).toBe(1000);
  });
});
