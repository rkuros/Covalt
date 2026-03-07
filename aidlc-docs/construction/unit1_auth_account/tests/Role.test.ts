import { describe, it, expect } from "vitest";
import { Role } from "../src/Role";

describe("Role", () => {
  // --- 正常系 ---

  it("owner で生成できること", () => {
    const role = Role.create("owner");
    expect(role.value).toBe("owner");
  });

  it("admin で生成できること", () => {
    const role = Role.create("admin");
    expect(role.value).toBe("admin");
  });

  it("同一の値を持つ Role 同士が等価であること", () => {
    const role1 = Role.create("owner");
    const role2 = Role.create("owner");
    expect(role1.equals(role2)).toBe(true);
  });

  it("異なる値を持つ Role 同士が等価でないこと", () => {
    const role1 = Role.create("owner");
    const role2 = Role.create("admin");
    expect(role1.equals(role2)).toBe(false);
  });

  it("PACT 契約のマッチングルール ^(owner|admin)$ に合致すること", () => {
    const pactRegex = /^(owner|admin)$/;
    expect(pactRegex.test(Role.OWNER.value)).toBe(true);
    expect(pactRegex.test(Role.ADMIN.value)).toBe(true);
  });

  it("静的フィールド OWNER が正しい値を持つこと", () => {
    expect(Role.OWNER.value).toBe("owner");
  });

  it("静的フィールド ADMIN が正しい値を持つこと", () => {
    expect(Role.ADMIN.value).toBe("admin");
  });

  // --- 異常系 ---

  it("owner, admin 以外の値で生成に失敗すること", () => {
    expect(() => Role.create("manager")).toThrow("不正なロールです: manager");
  });

  it("大文字の OWNER で生成に失敗すること", () => {
    expect(() => Role.create("OWNER")).toThrow("不正なロールです: OWNER");
  });

  it("空文字で生成に失敗すること", () => {
    expect(() => Role.create("")).toThrow("不正なロールです");
  });

  it("null で生成に失敗すること", () => {
    expect(() => Role.create(null as unknown as string)).toThrow();
  });

  it("undefined で生成に失敗すること", () => {
    expect(() => Role.create(undefined as unknown as string)).toThrow();
  });
});
