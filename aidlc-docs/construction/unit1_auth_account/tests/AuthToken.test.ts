import { describe, it, expect } from "vitest";
import { AuthToken } from "../src/AuthToken";

describe("AuthToken", () => {
  // --- 正常系 ---

  it("有効なトークン文字列で生成できること", () => {
    const token = AuthToken.create("valid-token-12345");
    expect(token.value).toBe("valid-token-12345");
  });

  it("トークンの生成ができること (generate)", () => {
    const token = AuthToken.generate();
    expect(token.value).toBeTruthy();
    expect(token.value.length).toBeGreaterThan(0);
  });

  it("生成されたトークンの値が取得できること", () => {
    const token = AuthToken.generate();
    expect(typeof token.value).toBe("string");
    expect(token.value.length).toBeGreaterThan(0);
  });

  it("generate で毎回異なるトークンが生成されること", () => {
    const token1 = AuthToken.generate();
    const token2 = AuthToken.generate();
    expect(token1.value).not.toBe(token2.value);
  });

  it("同一の値を持つ AuthToken 同士が等価であること", () => {
    const token1 = AuthToken.create("same-token");
    const token2 = AuthToken.create("same-token");
    expect(token1.equals(token2)).toBe(true);
  });

  it("異なる値を持つ AuthToken 同士が等価でないこと", () => {
    const token1 = AuthToken.create("token-a");
    const token2 = AuthToken.create("token-b");
    expect(token1.equals(token2)).toBe(false);
  });

  it("前後の空白がトリムされること", () => {
    const token = AuthToken.create("  token-value  ");
    expect(token.value).toBe("token-value");
  });

  // --- 異常系 ---

  it("空文字で生成に失敗すること", () => {
    expect(() => AuthToken.create("")).toThrow("トークンは必須です");
  });

  it("空白のみで生成に失敗すること", () => {
    expect(() => AuthToken.create("   ")).toThrow("トークンは必須です");
  });

  it("null で生成に失敗すること", () => {
    expect(() => AuthToken.create(null as unknown as string)).toThrow();
  });

  it("undefined で生成に失敗すること", () => {
    expect(() => AuthToken.create(undefined as unknown as string)).toThrow();
  });
});
