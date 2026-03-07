import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChannelConfigService } from "../src/ChannelConfigService";
import { LineChannelConfig } from "../src/LineChannelConfig";
import { InMemoryLineChannelConfigRepository } from "../src/InMemoryLineChannelConfigRepository";
import { ChannelConfigNotFoundError } from "../src/DomainErrors";
import type { LineMessagingGateway } from "../src/LineMessagingGateway";

describe("ChannelConfigService", () => {
  let channelConfigRepo: InMemoryLineChannelConfigRepository;
  let messagingGateway: LineMessagingGateway;
  let service: ChannelConfigService;

  const ownerId = "owner-001";
  const validCreateParams = {
    ownerId,
    channelAccessToken: "token-abc123",
    channelSecret: "secret-xyz789",
    liffId: "1234567890-abcdefgh",
    webhookUrl: "https://example.com/webhook",
  };

  beforeEach(() => {
    channelConfigRepo = new InMemoryLineChannelConfigRepository();
    messagingGateway = {
      pushMessage: vi.fn(),
      getProfile: vi.fn(),
    };
    service = new ChannelConfigService(channelConfigRepo, messagingGateway);
  });

  // --- 正常系 ---

  it("LINE チャネル設定を新規作成できること", async () => {
    const config = await service.createConfig(validCreateParams);

    expect(config).toBeDefined();
    expect(config.ownerId).toBe(ownerId);
    expect(config.channelAccessToken).toBe("token-abc123");
    expect(config.channelSecret).toBe("secret-xyz789");
    expect(config.liffId).toBe("1234567890-abcdefgh");
    expect(config.isActive).toBe(true);
  });

  it("新規作成した設定がリポジトリに保存されること", async () => {
    await service.createConfig(validCreateParams);

    const saved = await channelConfigRepo.findByOwnerId(ownerId);
    expect(saved).not.toBeNull();
    expect(saved!.ownerId).toBe(ownerId);
  });

  it("既存の LINE チャネル設定を更新できること", async () => {
    await service.createConfig(validCreateParams);

    const updated = await service.updateCredentials(
      ownerId,
      "new-token",
      "new-secret",
    );

    expect(updated.channelAccessToken).toBe("new-token");
    expect(updated.channelSecret).toBe("new-secret");
  });

  it("liffId を更新できること", async () => {
    await service.createConfig(validCreateParams);

    const updated = await service.updateLiffId(ownerId, "new-liff-id");

    expect(updated.liffId).toBe("new-liff-id");
  });

  it("LINE チャネル設定を取得できること", async () => {
    await service.createConfig(validCreateParams);

    const config = await service.getConfig(ownerId);

    expect(config.ownerId).toBe(ownerId);
    expect(config.channelAccessToken).toBe("token-abc123");
  });

  it("LINE チャネル設定を削除できること", async () => {
    await service.createConfig(validCreateParams);

    await service.deleteConfig(ownerId);

    const deleted = await channelConfigRepo.findByOwnerId(ownerId);
    expect(deleted).toBeNull();
  });

  it("接続テストが成功した場合に成功レスポンスが返ること", async () => {
    await service.createConfig(validCreateParams);

    vi.mocked(messagingGateway.getProfile).mockResolvedValue({
      lineUserId: "self",
      displayName: "Bot",
    });

    const result = await service.testConnection(ownerId);

    expect(result.success).toBe(true);
    expect(result.message).toBe("接続テストに成功しました");
  });

  it("Webhook URL が作成時に設定されること", async () => {
    const config = await service.createConfig(validCreateParams);

    expect(config.webhookUrl).toBe("https://example.com/webhook");
  });

  // --- 異常系 ---

  it("接続テストが失敗した場合にエラーレスポンスが返ること", async () => {
    await service.createConfig(validCreateParams);

    vi.mocked(messagingGateway.getProfile).mockRejectedValue(
      new Error("Invalid channel access token"),
    );

    const result = await service.testConnection(ownerId);

    expect(result.success).toBe(false);
    expect(result.message).toContain("接続テストに失敗しました");
  });

  it("存在しない ownerId で設定を取得しようとした場合に ChannelConfigNotFoundError が返ること", async () => {
    await expect(
      service.getConfig("non-existent-owner"),
    ).rejects.toThrow(ChannelConfigNotFoundError);
  });

  it("既に設定が存在する ownerId で重複作成しようとした場合にエラーが返ること", async () => {
    await service.createConfig(validCreateParams);

    await expect(service.createConfig(validCreateParams)).rejects.toThrow(
      "LINE チャネル設定は既に存在します",
    );
  });

  it("channelAccessToken が空文字列の場合にバリデーションエラーになること", async () => {
    await expect(
      service.createConfig({ ...validCreateParams, channelAccessToken: "" }),
    ).rejects.toThrow("channelAccessToken is required");
  });

  it("channelSecret が空文字列の場合にバリデーションエラーになること", async () => {
    await expect(
      service.createConfig({ ...validCreateParams, channelSecret: "" }),
    ).rejects.toThrow("channelSecret is required");
  });

  it("存在しない ownerId で削除しようとした場合に ChannelConfigNotFoundError が返ること", async () => {
    await expect(
      service.deleteConfig("non-existent-owner"),
    ).rejects.toThrow(ChannelConfigNotFoundError);
  });

  it("存在しない ownerId で接続テストを試みた場合に ChannelConfigNotFoundError が返ること", async () => {
    await expect(
      service.testConnection("non-existent-owner"),
    ).rejects.toThrow(ChannelConfigNotFoundError);
  });

  // --- 境界値 ---

  it("liffId の最小有効値 (1文字) で設定できること", async () => {
    const config = await service.createConfig({
      ...validCreateParams,
      liffId: "a",
    });
    expect(config.liffId).toBe("a");
  });
});
