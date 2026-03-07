import { describe, it, expect } from "vitest";
import { PushMessage } from "../src/PushMessage";

describe("PushMessage", () => {
  // --- 正常系 ---

  it("type: text, text を指定して生成できること", () => {
    const msg = PushMessage.createText("こんにちは");
    expect(msg).toBeDefined();
    expect(msg.type).toBe("text");
  });

  it("type: flex, text, altText を指定して生成できること", () => {
    const msg = PushMessage.createFlex(
      '{"type":"bubble","body":{}}',
      "予約確認メッセージ",
    );
    expect(msg).toBeDefined();
    expect(msg.type).toBe("flex");
  });

  it("生成後の各プロパティが入力値と一致すること (text)", () => {
    const msg = PushMessage.createText("テストメッセージ");
    expect(msg.type).toBe("text");
    expect(msg.text).toBe("テストメッセージ");
    expect(msg.altText).toBeUndefined();
  });

  it("生成後の各プロパティが入力値と一致すること (flex)", () => {
    const msg = PushMessage.createFlex("flexコンテンツ", "代替テキスト");
    expect(msg.type).toBe("flex");
    expect(msg.text).toBe("flexコンテンツ");
    expect(msg.altText).toBe("代替テキスト");
  });

  it("同じ属性値を持つ2つの PushMessage(text) が等価であること", () => {
    const a = PushMessage.createText("同じテキスト");
    const b = PushMessage.createText("同じテキスト");
    expect(a.equals(b)).toBe(true);
  });

  it("同じ属性値を持つ2つの PushMessage(flex) が等価であること", () => {
    const a = PushMessage.createFlex("コンテンツ", "代替");
    const b = PushMessage.createFlex("コンテンツ", "代替");
    expect(a.equals(b)).toBe(true);
  });

  it("異なる属性値を持つ2つの PushMessage が等価でないこと", () => {
    const a = PushMessage.createText("テキストA");
    const b = PushMessage.createText("テキストB");
    expect(a.equals(b)).toBe(false);
  });

  // --- 異常系 ---

  it("type: text で text が空文字列の場合にバリデーションエラーになること", () => {
    expect(() => PushMessage.createText("")).toThrow(
      "PushMessage text must not be empty",
    );
  });

  it("type: text で text が空白文字のみの場合にバリデーションエラーになること", () => {
    expect(() => PushMessage.createText("   ")).toThrow(
      "PushMessage text must not be empty",
    );
  });

  it("type: text で text が null の場合にバリデーションエラーになること", () => {
    expect(() =>
      PushMessage.createText(null as unknown as string),
    ).toThrow();
  });

  it("type: text で text が undefined の場合にバリデーションエラーになること", () => {
    expect(() =>
      PushMessage.createText(undefined as unknown as string),
    ).toThrow();
  });

  it("type: flex で altText が空文字列の場合にバリデーションエラーになること", () => {
    expect(() => PushMessage.createFlex("コンテンツ", "")).toThrow(
      "PushMessage altText is required for flex messages",
    );
  });

  it("type: flex で altText が空白文字のみの場合にバリデーションエラーになること", () => {
    expect(() => PushMessage.createFlex("コンテンツ", "   ")).toThrow(
      "PushMessage altText is required for flex messages",
    );
  });

  it("type: flex で text が空文字列の場合にバリデーションエラーになること", () => {
    expect(() => PushMessage.createFlex("", "代替テキスト")).toThrow(
      "PushMessage text must not be empty",
    );
  });

  // --- 境界値 ---

  it("text が1文字の PushMessage を生成できること", () => {
    const msg = PushMessage.createText("a");
    expect(msg.text).toBe("a");
  });

  it("改行を含む text で生成できること", () => {
    const text = "予約が確定しました。\n日時: 2024-01-15 10:00";
    const msg = PushMessage.createText(text);
    expect(msg.text).toBe(text);
  });

  it("5000文字の text で生成できること (LINE API 準拠)", () => {
    const longText = "あ".repeat(5000);
    const msg = PushMessage.createText(longText);
    expect(msg.text.length).toBe(5000);
  });
});
