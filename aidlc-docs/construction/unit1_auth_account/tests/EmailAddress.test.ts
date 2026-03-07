import { describe, it, expect } from "vitest";
import { EmailAddress } from "../src/EmailAddress";

describe("EmailAddress", () => {
  // --- 正常系 ---

  it("有効なメールアドレス形式で生成できること", () => {
    const email = EmailAddress.create("owner@example.com");
    expect(email.value).toBe("owner@example.com");
  });

  it("サブドメイン付きメールアドレスで生成できること", () => {
    const email = EmailAddress.create("user@mail.example.com");
    expect(email.value).toBe("user@mail.example.com");
  });

  it("+ 記号付きメールアドレスで生成できること", () => {
    const email = EmailAddress.create("user+tag@example.com");
    expect(email.value).toBe("user+tag@example.com");
  });

  it("同一の値を持つ EmailAddress 同士が等価であること", () => {
    const email1 = EmailAddress.create("owner@example.com");
    const email2 = EmailAddress.create("owner@example.com");
    expect(email1.equals(email2)).toBe(true);
  });

  it("大文字を含むメールアドレスが小文字に正規化されること", () => {
    const email = EmailAddress.create("Owner@Example.COM");
    expect(email.value).toBe("owner@example.com");
  });

  it("前後の空白がトリムされること", () => {
    const email = EmailAddress.create("  owner@example.com  ");
    expect(email.value).toBe("owner@example.com");
  });

  // --- 異常系 ---

  it("@ がないメールアドレスで生成に失敗すること", () => {
    expect(() => EmailAddress.create("ownerexample.com")).toThrow(
      "メールアドレスの形式が不正です",
    );
  });

  it("ドメイン部分がないメールアドレスで生成に失敗すること", () => {
    expect(() => EmailAddress.create("user@")).toThrow(
      "メールアドレスの形式が不正です",
    );
  });

  it("ローカル部分がないメールアドレスで生成に失敗すること", () => {
    expect(() => EmailAddress.create("@example.com")).toThrow(
      "メールアドレスの形式が不正です",
    );
  });

  it("空文字で生成に失敗すること", () => {
    expect(() => EmailAddress.create("")).toThrow("メールアドレスは必須です");
  });

  it("空白のみで生成に失敗すること", () => {
    expect(() => EmailAddress.create("   ")).toThrow("メールアドレスは必須です");
  });

  it("null で生成に失敗すること", () => {
    expect(() => EmailAddress.create(null as unknown as string)).toThrow();
  });

  it("undefined で生成に失敗すること", () => {
    expect(() => EmailAddress.create(undefined as unknown as string)).toThrow();
  });

  // --- 境界値 ---

  it("最大長 254 文字のメールアドレスで生成できること", () => {
    // ローカル部(64) + @ + ドメイン部(189) = 254
    const local = "a".repeat(64);
    const domain = "b".repeat(185) + ".com";
    const email = EmailAddress.create(`${local}@${domain}`);
    expect(email.value).toBe(`${local}@${domain}`);
  });

  it("異なる値を持つ EmailAddress 同士が等価でないこと", () => {
    const email1 = EmailAddress.create("user1@example.com");
    const email2 = EmailAddress.create("user2@example.com");
    expect(email1.equals(email2)).toBe(false);
  });
});
