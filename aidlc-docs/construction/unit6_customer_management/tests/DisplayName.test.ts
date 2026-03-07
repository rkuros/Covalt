import { describe, it, expect } from "vitest";
import { DisplayName } from "../src/DisplayName";

describe("DisplayName", () => {
  // Step 1-4

  it("正常系: 有効な文字列で DisplayName を生成できる", () => {
    const name = DisplayName.create("Taro Tanaka");
    expect(name.value).toBe("Taro Tanaka");
  });

  it("正常系: null を許容する（nullable） -- DisplayName はエンティティ側で null として扱う", () => {
    const displayName: DisplayName | null = null;
    expect(displayName).toBeNull();
  });

  it("異常系: 空文字列で DisplayName を生成しようとするとエラーになる", () => {
    expect(() => DisplayName.create("")).toThrow(
      "DisplayName must not be empty"
    );
  });

  it("異常系: null で DisplayName.create を呼ぶとエラーになる", () => {
    expect(() => DisplayName.create(null as unknown as string)).toThrow(
      "DisplayName must not be empty"
    );
  });

  it("equals() で同じ値を持つ DisplayName は等価と判定される", () => {
    const name1 = DisplayName.create("Taro");
    const name2 = DisplayName.create("Taro");
    expect(name1.equals(name2)).toBe(true);
  });

  it("toString() で値が文字列として返される", () => {
    const name = DisplayName.create("Taro");
    expect(name.toString()).toBe("Taro");
  });
});
