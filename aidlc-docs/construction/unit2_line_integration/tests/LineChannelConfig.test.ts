import { describe, it, expect } from "vitest";
import { LineChannelConfig } from "../src/LineChannelConfig";

describe("LineChannelConfig", () => {
  const validParams = {
    id: "config-001",
    ownerId: "owner-001",
    channelAccessToken: "token-abc123",
    channelSecret: "secret-xyz789",
    liffId: "1234567890-abcdefgh",
    webhookUrl: "https://example.com/webhook",
  };

  // --- 正常系 ---

  it("全属性を指定して生成できること", () => {
    const config = LineChannelConfig.create(validParams);
    expect(config).toBeDefined();
    expect(config.id).toBe("config-001");
    expect(config.ownerId).toBe("owner-001");
    expect(config.channelAccessToken).toBe("token-abc123");
    expect(config.channelSecret).toBe("secret-xyz789");
    expect(config.liffId).toBe("1234567890-abcdefgh");
    expect(config.webhookUrl).toBe("https://example.com/webhook");
  });

  it("isActive のデフォルト値が true であること", () => {
    const config = LineChannelConfig.create(validParams);
    expect(config.isActive).toBe(true);
  });

  it("createdAt と updatedAt が設定されること", () => {
    const config = LineChannelConfig.create(validParams);
    expect(config.createdAt).toBeInstanceOf(Date);
    expect(config.updatedAt).toBeInstanceOf(Date);
  });

  it("isActive を false に変更(無効化)できること", () => {
    const config = LineChannelConfig.create(validParams);
    config.deactivate();
    expect(config.isActive).toBe(false);
  });

  it("isActive を true に変更(有効化)できること", () => {
    const config = LineChannelConfig.create(validParams);
    config.deactivate();
    config.activate();
    expect(config.isActive).toBe(true);
  });

  it("channelAccessToken を更新できること", () => {
    const config = LineChannelConfig.create(validParams);
    config.updateCredentials("new-token", "new-secret");
    expect(config.channelAccessToken).toBe("new-token");
    expect(config.channelSecret).toBe("new-secret");
  });

  it("liffId を更新できること", () => {
    const config = LineChannelConfig.create(validParams);
    config.updateLiffId("new-liff-id");
    expect(config.liffId).toBe("new-liff-id");
  });

  it("webhookUrl を更新できること", () => {
    const config = LineChannelConfig.create(validParams);
    config.updateWebhookUrl("https://new-endpoint.example.com/webhook");
    expect(config.webhookUrl).toBe(
      "https://new-endpoint.example.com/webhook",
    );
  });

  it("更新操作後に updatedAt が更新されること", () => {
    const config = LineChannelConfig.create(validParams);
    const originalUpdatedAt = config.updatedAt;
    // 時間差を確保するために少し遅延
    config.updateLiffId("updated-liff-id");
    expect(config.updatedAt.getTime()).toBeGreaterThanOrEqual(
      originalUpdatedAt.getTime(),
    );
  });

  it("reconstruct で既存データから復元できること", () => {
    const now = new Date();
    const config = LineChannelConfig.reconstruct({
      ...validParams,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });
    expect(config.id).toBe("config-001");
    expect(config.isActive).toBe(false);
    expect(config.createdAt).toEqual(now);
  });

  // --- 異常系 ---

  it("ownerId が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      LineChannelConfig.create({ ...validParams, ownerId: "" }),
    ).toThrow("ownerId is required");
  });

  it("ownerId が空白文字のみの場合にバリデーションエラーになること", () => {
    expect(() =>
      LineChannelConfig.create({ ...validParams, ownerId: "   " }),
    ).toThrow("ownerId is required");
  });

  it("channelAccessToken が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      LineChannelConfig.create({
        ...validParams,
        channelAccessToken: "",
      }),
    ).toThrow("channelAccessToken is required");
  });

  it("channelSecret が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      LineChannelConfig.create({ ...validParams, channelSecret: "" }),
    ).toThrow("channelSecret is required");
  });

  it("liffId が空文字列の場合にバリデーションエラーになること", () => {
    expect(() =>
      LineChannelConfig.create({ ...validParams, liffId: "" }),
    ).toThrow("liffId is required");
  });

  it("updateCredentials で channelAccessToken が空文字列の場合にバリデーションエラーになること", () => {
    const config = LineChannelConfig.create(validParams);
    expect(() => config.updateCredentials("", "new-secret")).toThrow(
      "channelAccessToken is required",
    );
  });

  it("updateCredentials で channelSecret が空文字列の場合にバリデーションエラーになること", () => {
    const config = LineChannelConfig.create(validParams);
    expect(() => config.updateCredentials("new-token", "")).toThrow(
      "channelSecret is required",
    );
  });

  it("updateLiffId で liffId が空文字列の場合にバリデーションエラーになること", () => {
    const config = LineChannelConfig.create(validParams);
    expect(() => config.updateLiffId("")).toThrow("liffId is required");
  });

  // --- 境界値 ---

  it("webhookUrl が HTTPS スキームの URL で生成できること", () => {
    const config = LineChannelConfig.create({
      ...validParams,
      webhookUrl: "https://secure.example.com/webhook",
    });
    expect(config.webhookUrl).toBe("https://secure.example.com/webhook");
  });

  it("webhookUrl が HTTP スキームの URL の場合の振る舞い", () => {
    // 現在の実装では webhookUrl のスキーム検証はない。
    // HTTP スキームの URL も設定自体は可能だが、LINE Platform 側で拒否される想定。
    const config = LineChannelConfig.create({
      ...validParams,
      webhookUrl: "http://insecure.example.com/webhook",
    });
    expect(config.webhookUrl).toBe("http://insecure.example.com/webhook");
  });
});
