import { describe, it, expect } from "vitest";
import { OwnerId } from "../src/OwnerId";

describe("OwnerId", () => {
  // Step 1-2

  it("正常系: 有効な文字列で OwnerId を生成できる", () => {
    const id = OwnerId.create("owner-001");
    expect(id.value).toBe("owner-001");
  });

  it("異常系: 空文字列で OwnerId を生成しようとするとエラーになる", () => {
    expect(() => OwnerId.create("")).toThrow("OwnerId must not be empty");
  });

  it("異常系: null で OwnerId を生成しようとするとエラーになる", () => {
    expect(() => OwnerId.create(null as unknown as string)).toThrow(
      "OwnerId must not be empty"
    );
  });

  it("異常系: undefined で OwnerId を生成しようとするとエラーになる", () => {
    expect(() => OwnerId.create(undefined as unknown as string)).toThrow(
      "OwnerId must not be empty"
    );
  });

  it("equals() で同じ値を持つ OwnerId は等価と判定される", () => {
    const id1 = OwnerId.create("owner-001");
    const id2 = OwnerId.create("owner-001");
    expect(id1.equals(id2)).toBe(true);
  });

  it("equals() で異なる値を持つ OwnerId は等価でないと判定される", () => {
    const id1 = OwnerId.create("owner-001");
    const id2 = OwnerId.create("owner-002");
    expect(id1.equals(id2)).toBe(false);
  });

  it("toString() で値が文字列として返される", () => {
    const id = OwnerId.create("owner-001");
    expect(id.toString()).toBe("owner-001");
  });
});
