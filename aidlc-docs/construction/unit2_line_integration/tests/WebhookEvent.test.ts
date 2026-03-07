import { describe, it, expect } from "vitest";
import { WebhookEvent } from "../src/WebhookEvent";
import type { WebhookEventSource } from "../src/WebhookEvent";

describe("WebhookEvent", () => {
  const validSource: WebhookEventSource = {
    type: "user",
    userId: "U1234567890abcdef1234567890abcdef",
  };

  // --- 正常系 ---

  it("eventType: follow, timestamp, source を指定して生成できること", () => {
    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: validSource,
    });
    expect(event).toBeDefined();
    expect(event.eventType).toBe("follow");
    expect(event.isFollowEvent()).toBe(true);
  });

  it("eventType: unfollow で生成できること", () => {
    const event = WebhookEvent.create({
      eventType: "unfollow",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: validSource,
    });
    expect(event.eventType).toBe("unfollow");
    expect(event.isUnfollowEvent()).toBe(true);
  });

  it("eventType: message で生成できること", () => {
    const event = WebhookEvent.create({
      eventType: "message",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: validSource,
    });
    expect(event.eventType).toBe("message");
    expect(event.isMessageEvent()).toBe(true);
  });

  it("生成後の各プロパティが入力値と一致すること", () => {
    const ts = new Date("2024-01-15T10:00:00Z");
    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: ts,
      source: validSource,
      webhookEventId: "evt-001",
    });
    expect(event.eventType).toBe("follow");
    expect(event.timestamp).toEqual(ts);
    expect(event.source).toEqual(validSource);
    expect(event.webhookEventId).toBe("evt-001");
  });

  it("同じ属性値を持つ2つの WebhookEvent が等価であること", () => {
    const ts = new Date("2024-01-15T10:00:00Z");
    const params = {
      eventType: "follow" as const,
      timestamp: ts,
      source: validSource,
      webhookEventId: "evt-001",
    };
    const a = WebhookEvent.create(params);
    const b = WebhookEvent.create(params);
    expect(a.eventType).toBe(b.eventType);
    expect(a.timestamp).toEqual(b.timestamp);
    expect(a.source).toEqual(b.source);
    expect(a.webhookEventId).toBe(b.webhookEventId);
  });

  it("webhookEventId なしで生成できること", () => {
    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date(),
      source: validSource,
    });
    expect(event.webhookEventId).toBeUndefined();
  });

  it("isFollowEvent() は follow 以外で false を返すこと", () => {
    const event = WebhookEvent.create({
      eventType: "message",
      timestamp: new Date(),
      source: validSource,
    });
    expect(event.isFollowEvent()).toBe(false);
  });

  it("isUnfollowEvent() は unfollow 以外で false を返すこと", () => {
    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date(),
      source: validSource,
    });
    expect(event.isUnfollowEvent()).toBe(false);
  });

  it("isMessageEvent() は message 以外で false を返すこと", () => {
    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date(),
      source: validSource,
    });
    expect(event.isMessageEvent()).toBe(false);
  });

  // --- 異常系 ---

  it("eventType が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      WebhookEvent.create({
        eventType: "" as "follow",
        timestamp: new Date(),
        source: validSource,
      }),
    ).toThrow("WebhookEvent eventType is required");
  });

  it("eventType が null の場合にバリデーションエラーになること", () => {
    expect(() =>
      WebhookEvent.create({
        eventType: null as unknown as "follow",
        timestamp: new Date(),
        source: validSource,
      }),
    ).toThrow("WebhookEvent eventType is required");
  });

  it("eventType が undefined の場合にバリデーションエラーになること", () => {
    expect(() =>
      WebhookEvent.create({
        eventType: undefined as unknown as "follow",
        timestamp: new Date(),
        source: validSource,
      }),
    ).toThrow("WebhookEvent eventType is required");
  });

  it("timestamp が null の場合にバリデーションエラーになること", () => {
    expect(() =>
      WebhookEvent.create({
        eventType: "follow",
        timestamp: null as unknown as Date,
        source: validSource,
      }),
    ).toThrow("WebhookEvent timestamp is required");
  });

  it("source が null の場合にバリデーションエラーになること", () => {
    expect(() =>
      WebhookEvent.create({
        eventType: "follow",
        timestamp: new Date(),
        source: null as unknown as WebhookEventSource,
      }),
    ).toThrow("WebhookEvent source is required");
  });

  it("source が undefined の場合にバリデーションエラーになること", () => {
    expect(() =>
      WebhookEvent.create({
        eventType: "follow",
        timestamp: new Date(),
        source: undefined as unknown as WebhookEventSource,
      }),
    ).toThrow("WebhookEvent source is required");
  });

  // --- 境界値 ---

  it("timestamp が ISO 8601 形式の最小値で生成できること", () => {
    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date("2000-01-01T00:00:00Z"),
      source: validSource,
    });
    expect(event.timestamp).toEqual(new Date("2000-01-01T00:00:00Z"));
  });
});
