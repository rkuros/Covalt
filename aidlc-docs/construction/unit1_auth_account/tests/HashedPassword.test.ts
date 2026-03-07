import { describe, it, expect } from "vitest";
import { HashedPassword } from "../src/HashedPassword";

describe("HashedPassword", () => {
  // --- 正常系 ---

  it("ハッシュ化済みのパスワード文字列で生成できること (fromHash)", () => {
    const hash = "a".repeat(64); // SHA-256 ハッシュ相当の文字列
    const hashed = HashedPassword.fromHash(hash);
    expect(hashed.value).toBe(hash);
  });

  it("平文パスワードからハッシュ化して生成できること (create)", () => {
    const hashed = HashedPassword.create("password123");
    expect(hashed.value).toBeTruthy();
    expect(hashed.value).not.toBe("password123");
  });

  it("平文パスワードとの照合が正しく成功すること（一致するパスワード）", () => {
    const hashed = HashedPassword.create("securePass1");
    expect(hashed.matches("securePass1")).toBe(true);
  });

  it("同一の値を持つ HashedPassword 同士が等価であること", () => {
    const hashed1 = HashedPassword.create("password123");
    const hashed2 = HashedPassword.create("password123");
    expect(hashed1.equals(hashed2)).toBe(true);
  });

  // --- 異常系 ---

  it("平文パスワードとの照合が正しく失敗すること（不一致のパスワード）", () => {
    const hashed = HashedPassword.create("password123");
    expect(hashed.matches("wrongpassword")).toBe(false);
  });

  it("create で 8 文字未満のパスワードは生成に失敗すること", () => {
    expect(() => HashedPassword.create("short1")).toThrow(
      "パスワードは8文字以上である必要があります",
    );
  });

  it("create で空文字のパスワードは生成に失敗すること", () => {
    expect(() => HashedPassword.create("")).toThrow(
      "パスワードは8文字以上である必要があります",
    );
  });

  it("create で null は生成に失敗すること", () => {
    expect(() =>
      HashedPassword.create(null as unknown as string),
    ).toThrow();
  });

  it("create で undefined は生成に失敗すること", () => {
    expect(() =>
      HashedPassword.create(undefined as unknown as string),
    ).toThrow();
  });

  it("fromHash で空文字は生成に失敗すること", () => {
    expect(() => HashedPassword.fromHash("")).toThrow("ハッシュ値は必須です");
  });

  it("fromHash で null は生成に失敗すること", () => {
    expect(() =>
      HashedPassword.fromHash(null as unknown as string),
    ).toThrow();
  });

  it("fromHash で undefined は生成に失敗すること", () => {
    expect(() =>
      HashedPassword.fromHash(undefined as unknown as string),
    ).toThrow();
  });
});
