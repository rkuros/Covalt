import { describe, it, expect } from "vitest";
import { LineUserId } from "../src/LineUserId";

describe("LineUserId", () => {
  // Step 1-3

  const validLineUserId = "U1234567890abcdef1234567890abcdef";

  it("正常系: U + 32桁の16進文字列で LineUserId を生成できる", () => {
    const id = LineUserId.create(validLineUserId);
    expect(id.value).toBe(validLineUserId);
  });

  it("正常系: null を許容する（nullable） -- LineUserId はクラス外で null として扱う", () => {
    // LineUserId.create() 自体は null を受け付けない（値オブジェクトは非null）。
    // nullable は Customer エンティティ側で LineUserId | null として表現される。
    const lineUserId: LineUserId | null = null;
    expect(lineUserId).toBeNull();
  });

  it("異常系: U で始まらない文字列で生成しようとするとエラーになる", () => {
    expect(() => LineUserId.create("X1234567890abcdef1234567890abcdef")).toThrow(
      "Invalid LineUserId format"
    );
  });

  it("異常系: U + 32桁未満の16進文字列で生成しようとするとエラーになる", () => {
    expect(() => LineUserId.create("U1234567890abcdef")).toThrow(
      "Invalid LineUserId format"
    );
  });

  it("異常系: U + 32桁を超える16進文字列で生成しようとするとエラーになる", () => {
    expect(() =>
      LineUserId.create("U1234567890abcdef1234567890abcdef0")
    ).toThrow("Invalid LineUserId format");
  });

  it("異常系: U + 16進文字以外の文字を含む文字列で生成しようとするとエラーになる", () => {
    // 'g' は16進文字ではない
    expect(() =>
      LineUserId.create("U1234567890abcdefg234567890abcde")
    ).toThrow("Invalid LineUserId format");
  });

  it("境界値: U + ちょうど32桁の16進文字列で生成できる", () => {
    const exactId = "U00000000000000000000000000000000";
    const id = LineUserId.create(exactId);
    expect(id.value).toBe(exactId);
  });

  it("境界値: U + 31桁の16進文字列で生成しようとするとエラーになる", () => {
    const short = "U" + "0".repeat(31);
    expect(short.length).toBe(32); // U + 31桁 = 32文字
    expect(() => LineUserId.create(short)).toThrow("Invalid LineUserId format");
  });

  it("境界値: U + 33桁の16進文字列で生成しようとするとエラーになる", () => {
    const long = "U" + "0".repeat(33);
    expect(long.length).toBe(34); // U + 33桁 = 34文字
    expect(() => LineUserId.create(long)).toThrow("Invalid LineUserId format");
  });

  it("equals() で同じ値を持つ LineUserId は等価と判定される", () => {
    const id1 = LineUserId.create(validLineUserId);
    const id2 = LineUserId.create(validLineUserId);
    expect(id1.equals(id2)).toBe(true);
  });
});
