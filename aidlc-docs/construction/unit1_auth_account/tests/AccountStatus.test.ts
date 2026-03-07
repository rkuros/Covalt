import { describe, it, expect } from "vitest";
import { AccountStatus } from "../src/AccountStatus";

describe("AccountStatus", () => {
  // --- 正常系 ---

  it("ACTIVE で生成できること", () => {
    const status = AccountStatus.create("ACTIVE");
    expect(status.value).toBe("ACTIVE");
  });

  it("DISABLED で生成できること", () => {
    const status = AccountStatus.create("DISABLED");
    expect(status.value).toBe("DISABLED");
  });

  it("ACTIVE 状態のとき有効と判定されること", () => {
    const status = AccountStatus.create("ACTIVE");
    expect(status.isActive()).toBe(true);
  });

  it("DISABLED 状態のとき無効と判定されること", () => {
    const status = AccountStatus.create("DISABLED");
    expect(status.isActive()).toBe(false);
  });

  it("同一の値を持つ AccountStatus 同士が等価であること", () => {
    const status1 = AccountStatus.create("ACTIVE");
    const status2 = AccountStatus.create("ACTIVE");
    expect(status1.equals(status2)).toBe(true);
  });

  it("異なる値を持つ AccountStatus 同士が等価でないこと", () => {
    const status1 = AccountStatus.create("ACTIVE");
    const status2 = AccountStatus.create("DISABLED");
    expect(status1.equals(status2)).toBe(false);
  });

  it("静的フィールド ACTIVE が正しい値を持つこと", () => {
    expect(AccountStatus.ACTIVE.value).toBe("ACTIVE");
    expect(AccountStatus.ACTIVE.isActive()).toBe(true);
  });

  it("静的フィールド DISABLED が正しい値を持つこと", () => {
    expect(AccountStatus.DISABLED.value).toBe("DISABLED");
    expect(AccountStatus.DISABLED.isActive()).toBe(false);
  });

  // --- 異常系 ---

  it("ACTIVE, DISABLED 以外の値で生成に失敗すること", () => {
    expect(() => AccountStatus.create("PENDING")).toThrow(
      "不正なアカウントステータスです: PENDING",
    );
  });

  it("小文字の active で生成に失敗すること", () => {
    expect(() => AccountStatus.create("active")).toThrow(
      "不正なアカウントステータスです",
    );
  });

  it("空文字で生成に失敗すること", () => {
    expect(() => AccountStatus.create("")).toThrow(
      "不正なアカウントステータスです",
    );
  });

  it("null で生成に失敗すること", () => {
    expect(() =>
      AccountStatus.create(null as unknown as string),
    ).toThrow();
  });

  it("undefined で生成に失敗すること", () => {
    expect(() =>
      AccountStatus.create(undefined as unknown as string),
    ).toThrow();
  });
});
