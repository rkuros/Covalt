/**
 * LINE Messaging API へ送信するメッセージ1件分の構造を表す値オブジェクト。
 */
export type PushMessageType = "text" | "flex";

export class PushMessage {
  private constructor(
    public readonly type: PushMessageType,
    public readonly text: string,
    public readonly altText?: string,
  ) {
    Object.freeze(this);
  }

  static createText(text: string): PushMessage {
    if (!text || text.trim().length === 0) {
      throw new Error("PushMessage text must not be empty");
    }
    return new PushMessage("text", text);
  }

  static createFlex(text: string, altText: string): PushMessage {
    if (!text || text.trim().length === 0) {
      throw new Error("PushMessage text must not be empty");
    }
    if (!altText || altText.trim().length === 0) {
      throw new Error("PushMessage altText is required for flex messages");
    }
    return new PushMessage("flex", text, altText);
  }

  equals(other: PushMessage): boolean {
    return (
      this.type === other.type &&
      this.text === other.text &&
      this.altText === other.altText
    );
  }
}
