import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { WebhookReceiveService } from "../src/WebhookReceiveService";
import { WebhookEvent } from "../src/WebhookEvent";
import { LineChannelConfig } from "../src/LineChannelConfig";
import { InMemoryLineChannelConfigRepository } from "../src/InMemoryLineChannelConfigRepository";
import {
  ChannelConfigNotFoundError,
  WebhookSignatureVerificationError,
} from "../src/DomainErrors";

describe("WebhookReceiveService", () => {
  let channelConfigRepo: InMemoryLineChannelConfigRepository;
  let service: WebhookReceiveService;

  const ownerId = "owner-001";
  const channelSecret = "test-channel-secret";

  /** テスト用の正しい署名を生成するヘルパー */
  function computeSignature(body: string, secret: string): string {
    return createHmac("SHA256", secret).update(body).digest("base64");
  }

  beforeEach(async () => {
    channelConfigRepo = new InMemoryLineChannelConfigRepository();
    service = new WebhookReceiveService(channelConfigRepo);

    const config = LineChannelConfig.create({
      id: "config-001",
      ownerId,
      channelAccessToken: "token-abc",
      channelSecret,
      liffId: "liff-001",
      webhookUrl: "https://example.com/webhook",
    });
    await channelConfigRepo.save(config);
  });

  // --- 正常系 ---

  it("正当な x-line-signature を持つ Webhook リクエストの署名検証が成功すること", () => {
    const body = '{"events":[]}';
    const signature = computeSignature(body, channelSecret);

    const result = service.verifySignature(body, signature, channelSecret);
    expect(result).toBe(true);
  });

  it("follow イベントを受信し handler へディスパッチされること", async () => {
    const followHandler = vi.fn().mockResolvedValue(undefined);
    service.registerHandler("follow", followHandler);

    const body = '{"events":[{"type":"follow"}]}';
    const signature = computeSignature(body, channelSecret);

    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: { type: "user", userId: "U1234567890abcdef1234567890abcdef" },
      webhookEventId: "evt-follow-001",
    });

    await service.receive(ownerId, body, signature, [event]);

    expect(followHandler).toHaveBeenCalledTimes(1);
    expect(followHandler).toHaveBeenCalledWith(event);
  });

  it("unfollow イベントを受信し handler へディスパッチされること", async () => {
    const unfollowHandler = vi.fn().mockResolvedValue(undefined);
    service.registerHandler("unfollow", unfollowHandler);

    const body = '{"events":[{"type":"unfollow"}]}';
    const signature = computeSignature(body, channelSecret);

    const event = WebhookEvent.create({
      eventType: "unfollow",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: { type: "user", userId: "U1234567890abcdef1234567890abcdef" },
      webhookEventId: "evt-unfollow-001",
    });

    await service.receive(ownerId, body, signature, [event]);

    expect(unfollowHandler).toHaveBeenCalledTimes(1);
  });

  it("message イベントを受信し handler へディスパッチされること", async () => {
    const messageHandler = vi.fn().mockResolvedValue(undefined);
    service.registerHandler("message", messageHandler);

    const body = '{"events":[{"type":"message"}]}';
    const signature = computeSignature(body, channelSecret);

    const event = WebhookEvent.create({
      eventType: "message",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: { type: "user", userId: "U1234567890abcdef1234567890abcdef" },
      webhookEventId: "evt-message-001",
    });

    await service.receive(ownerId, body, signature, [event]);

    expect(messageHandler).toHaveBeenCalledTimes(1);
  });

  it("Webhook エンドポイントが例外なく処理を完了すること (200 応答相当)", async () => {
    const body = '{"events":[]}';
    const signature = computeSignature(body, channelSecret);

    // イベントなしでも例外なく完了する
    await expect(
      service.receive(ownerId, body, signature, []),
    ).resolves.toBeUndefined();
  });

  // --- 異常系 ---

  it("x-line-signature が不正な場合にリクエストを拒否すること", async () => {
    const body = '{"events":[]}';
    const invalidSignature = "invalid-signature-value";

    await expect(
      service.receive(ownerId, body, invalidSignature, []),
    ).rejects.toThrow(WebhookSignatureVerificationError);
  });

  it("x-line-signature ヘッダが空文字列の場合にリクエストを拒否すること", async () => {
    const body = '{"events":[]}';

    await expect(
      service.receive(ownerId, body, "", []),
    ).rejects.toThrow(WebhookSignatureVerificationError);
  });

  it("不明なイベント種別を受信した場合に handler が呼ばれずスキップされること", async () => {
    const followHandler = vi.fn().mockResolvedValue(undefined);
    service.registerHandler("follow", followHandler);

    const body = '{"events":[{"type":"postback"}]}';
    const signature = computeSignature(body, channelSecret);

    const event = WebhookEvent.create({
      eventType: "postback",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: { type: "user", userId: "U1234567890abcdef1234567890abcdef" },
      webhookEventId: "evt-postback-001",
    });

    // postback のハンドラは登録していないので、エラーにはならずスキップされる
    await expect(
      service.receive(ownerId, body, signature, [event]),
    ).resolves.toBeUndefined();

    expect(followHandler).not.toHaveBeenCalled();
  });

  it("ownerId に紐づく ChannelConfig が存在しない場合に ChannelConfigNotFoundError が返ること", async () => {
    const body = '{"events":[]}';
    const signature = "dummy";

    await expect(
      service.receive("non-existent-owner", body, signature, []),
    ).rejects.toThrow(ChannelConfigNotFoundError);
  });

  // --- 冪等性 ---

  it("同一 webhookEventId のイベントを2回受信した場合に重複処理されないこと", async () => {
    const followHandler = vi.fn().mockResolvedValue(undefined);
    service.registerHandler("follow", followHandler);

    const body = '{"events":[{"type":"follow"}]}';
    const signature = computeSignature(body, channelSecret);

    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: { type: "user", userId: "U1234567890abcdef1234567890abcdef" },
      webhookEventId: "evt-duplicate-001",
    });

    await service.receive(ownerId, body, signature, [event]);
    await service.receive(ownerId, body, signature, [event]);

    expect(followHandler).toHaveBeenCalledTimes(1);
  });

  it("同一 webhookEventId のイベントを2回受信した場合にも正常完了すること (200 応答相当)", async () => {
    const followHandler = vi.fn().mockResolvedValue(undefined);
    service.registerHandler("follow", followHandler);

    const body = '{"events":[{"type":"follow"}]}';
    const signature = computeSignature(body, channelSecret);

    const event = WebhookEvent.create({
      eventType: "follow",
      timestamp: new Date("2024-01-15T10:00:00Z"),
      source: { type: "user", userId: "U1234567890abcdef1234567890abcdef" },
      webhookEventId: "evt-duplicate-002",
    });

    await service.receive(ownerId, body, signature, [event]);
    // 2回目も例外なく完了する
    await expect(
      service.receive(ownerId, body, signature, [event]),
    ).resolves.toBeUndefined();
  });

  // --- 境界値 ---

  it("channelSecret が空文字列の状態で署名検証を行った場合に検証失敗すること", () => {
    const body = '{"events":[]}';
    const signature = computeSignature(body, channelSecret);

    // 空の channelSecret では正しい署名と一致しない
    const result = service.verifySignature(body, signature, "");
    expect(result).toBe(false);
  });
});
