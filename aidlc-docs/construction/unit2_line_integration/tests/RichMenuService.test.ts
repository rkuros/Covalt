import { describe, it, expect, vi, beforeEach } from "vitest";
import { RichMenuService } from "../src/RichMenuService";
import { LineChannelConfig } from "../src/LineChannelConfig";
import { InMemoryLineChannelConfigRepository } from "../src/InMemoryLineChannelConfigRepository";
import { ChannelConfigNotFoundError } from "../src/DomainErrors";
import type { RichMenuGateway } from "../src/RichMenuGateway";

describe("RichMenuService", () => {
  let channelConfigRepo: InMemoryLineChannelConfigRepository;
  let richMenuGateway: RichMenuGateway;
  let service: RichMenuService;

  const ownerId = "owner-001";
  const liffId = "1234567890-abcdefgh";

  beforeEach(async () => {
    channelConfigRepo = new InMemoryLineChannelConfigRepository();
    richMenuGateway = {
      createRichMenu: vi.fn(),
      setDefaultRichMenu: vi.fn(),
    };
    service = new RichMenuService(channelConfigRepo, richMenuGateway);

    const config = LineChannelConfig.create({
      id: "config-001",
      ownerId,
      channelAccessToken: "token-abc",
      channelSecret: "secret-xyz",
      liffId,
      webhookUrl: "https://example.com/webhook",
    });
    await channelConfigRepo.save(config);
  });

  // --- 正常系 ---

  it("リッチメニューを LINE Platform に対して作成できること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-001",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockResolvedValue(
      undefined,
    );

    const richMenuId = await service.setupDefaultRichMenu(
      ownerId,
      "予約メニュー",
    );

    expect(richMenuId).toBe("richmenu-001");
    expect(richMenuGateway.createRichMenu).toHaveBeenCalledTimes(1);
  });

  it("リッチメニューに LIFF URL が正しく埋め込まれること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-002",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockResolvedValue(
      undefined,
    );

    await service.setupDefaultRichMenu(ownerId, "予約メニュー");

    expect(richMenuGateway.createRichMenu).toHaveBeenCalledWith(
      "token-abc",
      expect.objectContaining({
        liffUrl: `https://liff.line.me/${liffId}`,
      }),
    );
  });

  it("リッチメニューのアクション名が設定されること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-003",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockResolvedValue(
      undefined,
    );

    await service.setupDefaultRichMenu(ownerId, "予約する");

    expect(richMenuGateway.createRichMenu).toHaveBeenCalledWith(
      "token-abc",
      expect.objectContaining({
        name: "予約する",
      }),
    );
  });

  it("リッチメニューをデフォルトメニューとして設定できること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-004",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockResolvedValue(
      undefined,
    );

    await service.setupDefaultRichMenu(ownerId, "予約メニュー");

    expect(richMenuGateway.setDefaultRichMenu).toHaveBeenCalledWith(
      "token-abc",
      "richmenu-004",
    );
  });

  it("LIFF URL が liffId に基づいて正しく生成されること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-005",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockResolvedValue(
      undefined,
    );

    await service.setupDefaultRichMenu(ownerId, "メニュー");

    const callArgs = vi.mocked(richMenuGateway.createRichMenu).mock
      .calls[0];
    const config = callArgs[1];
    expect(config.liffUrl).toBe(`https://liff.line.me/${liffId}`);
  });

  // --- 異常系 ---

  it("LINE Platform へのリッチメニュー作成 API 呼び出しが失敗した場合にエラーが返ること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockRejectedValue(
      new Error("Rich menu creation failed"),
    );

    await expect(
      service.setupDefaultRichMenu(ownerId, "メニュー"),
    ).rejects.toThrow("Rich menu creation failed");
  });

  it("ownerId に紐づく LineChannelConfig が存在しない場合に ChannelConfigNotFoundError が返ること", async () => {
    await expect(
      service.setupDefaultRichMenu("non-existent-owner", "メニュー"),
    ).rejects.toThrow(ChannelConfigNotFoundError);
  });

  it("liffId が未設定(空)の LineChannelConfig でリッチメニュー作成を試みた場合", async () => {
    // liffId が空の設定は LineChannelConfig.create で拒否される。
    // ただし reconstruct 経由であれば可能。
    const configWithEmptyLiff = LineChannelConfig.reconstruct({
      id: "config-empty-liff",
      ownerId: "owner-empty-liff",
      channelAccessToken: "token",
      channelSecret: "secret",
      liffId: "",
      webhookUrl: "https://example.com/webhook",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await channelConfigRepo.save(configWithEmptyLiff);

    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-006",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockResolvedValue(
      undefined,
    );

    // 空の liffId でも LIFF URL が生成される（不正な URL になる）
    const richMenuId = await service.setupDefaultRichMenu(
      "owner-empty-liff",
      "メニュー",
    );
    expect(richMenuId).toBe("richmenu-006");

    // LIFF URL は空の liffId を含む
    expect(richMenuGateway.createRichMenu).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({
        liffUrl: "https://liff.line.me/",
      }),
    );
  });

  it("setDefaultRichMenu が失敗した場合にエラーが返ること", async () => {
    vi.mocked(richMenuGateway.createRichMenu).mockResolvedValue(
      "richmenu-007",
    );
    vi.mocked(richMenuGateway.setDefaultRichMenu).mockRejectedValue(
      new Error("Set default failed"),
    );

    await expect(
      service.setupDefaultRichMenu(ownerId, "メニュー"),
    ).rejects.toThrow("Set default failed");
  });
});
