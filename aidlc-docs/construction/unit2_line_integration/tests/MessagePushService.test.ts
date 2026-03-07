import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessagePushService } from "../src/MessagePushService";
import { LineUserId } from "../src/LineUserId";
import { PushMessage } from "../src/PushMessage";
import { LineFriendship } from "../src/LineFriendship";
import { LineChannelConfig } from "../src/LineChannelConfig";
import { InMemoryLineChannelConfigRepository } from "../src/InMemoryLineChannelConfigRepository";
import { InMemoryLineFriendshipRepository } from "../src/InMemoryLineFriendshipRepository";
import {
  ChannelConfigNotFoundError,
  UserBlockedError,
} from "../src/DomainErrors";
import type { LineMessagingGateway } from "../src/LineMessagingGateway";

describe("MessagePushService", () => {
  let channelConfigRepo: InMemoryLineChannelConfigRepository;
  let friendshipRepo: InMemoryLineFriendshipRepository;
  let messagingGateway: LineMessagingGateway;
  let service: MessagePushService;

  const ownerId = "owner-001";
  const lineUserId = LineUserId.create("U1234567890abcdef1234567890abcdef");

  beforeEach(async () => {
    channelConfigRepo = new InMemoryLineChannelConfigRepository();
    friendshipRepo = new InMemoryLineFriendshipRepository();
    messagingGateway = {
      pushMessage: vi.fn(),
      getProfile: vi.fn(),
    };
    service = new MessagePushService(
      channelConfigRepo,
      friendshipRepo,
      messagingGateway,
    );

    // デフォルトのチャネル設定を登録
    const config = LineChannelConfig.create({
      id: "config-001",
      ownerId,
      channelAccessToken: "token-abc",
      channelSecret: "secret-xyz",
      liffId: "liff-001",
      webhookUrl: "https://example.com/webhook",
    });
    await channelConfigRepo.save(config);

    // デフォルトの友だち関係を登録
    const friendship = LineFriendship.create({
      id: "friendship-001",
      ownerId,
      lineUserId,
      displayName: "テストユーザー",
    });
    await friendshipRepo.save(friendship);
  });

  // --- 正常系 ---

  it("プッシュメッセージ(type: text)を送信し success: true と messageId が返却されること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockResolvedValue("msg-001");

    const messages = [PushMessage.createText("テストメッセージ")];
    const result = await service.pushMessage(ownerId, lineUserId, messages);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-001");
    expect(messagingGateway.pushMessage).toHaveBeenCalledWith(
      "token-abc",
      lineUserId.value,
      messages,
    );
  });

  it("プッシュメッセージ(type: flex)を送信し success: true と messageId が返却されること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockResolvedValue("msg-002");

    const messages = [PushMessage.createFlex("flexコンテンツ", "代替テキスト")];
    const result = await service.pushMessage(ownerId, lineUserId, messages);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-002");
  });

  it("複数メッセージを1回のリクエストで送信できること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockResolvedValue("msg-003");

    const messages = [
      PushMessage.createText("メッセージ1"),
      PushMessage.createText("メッセージ2"),
      PushMessage.createFlex("flexコンテンツ", "代替テキスト"),
    ];
    const result = await service.pushMessage(ownerId, lineUserId, messages);

    expect(result.success).toBe(true);
    expect(messagingGateway.pushMessage).toHaveBeenCalledWith(
      "token-abc",
      lineUserId.value,
      messages,
    );
  });

  // --- 異常系 ---

  it("ブロック済みユーザーへの送信時に UserBlockedError が返ること", async () => {
    // 友だち関係をブロック状態にする
    const friendship = await friendshipRepo.findByOwnerIdAndLineUserId(
      ownerId,
      lineUserId,
    );
    friendship!.block();
    await friendshipRepo.save(friendship!);

    const messages = [PushMessage.createText("テスト")];

    await expect(
      service.pushMessage(ownerId, lineUserId, messages),
    ).rejects.toThrow(UserBlockedError);
  });

  it("ブロック済みユーザーへの送信時のエラーメッセージが適切であること", async () => {
    const friendship = await friendshipRepo.findByOwnerIdAndLineUserId(
      ownerId,
      lineUserId,
    );
    friendship!.block();
    await friendshipRepo.save(friendship!);

    const messages = [PushMessage.createText("テスト")];

    await expect(
      service.pushMessage(ownerId, lineUserId, messages),
    ).rejects.toThrow(
      "ユーザーがアカウントをブロックしているため送信できません",
    );
  });

  it("存在しない ownerId でメッセージ送信を試みた場合に ChannelConfigNotFoundError が返ること", async () => {
    const messages = [PushMessage.createText("テスト")];

    await expect(
      service.pushMessage("non-existent-owner", lineUserId, messages),
    ).rejects.toThrow(ChannelConfigNotFoundError);
  });

  it("存在しない lineUserId でもフレンドシップが無ければ送信を試みること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockResolvedValue("msg-004");

    const unknownUserId = LineUserId.create(
      "Uabcdefabcdefabcdefabcdefabcdefab",
    );
    const messages = [PushMessage.createText("テスト")];
    const result = await service.pushMessage(
      ownerId,
      unknownUserId,
      messages,
    );

    // 友だち関係が未登録の場合、ブロックチェックをスキップして送信を試みる
    expect(result.success).toBe(true);
  });

  it("LINE Messaging API がエラーを返した場合にエラーがスローされること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockRejectedValue(
      new Error("LINE API Error"),
    );

    const messages = [PushMessage.createText("テスト")];

    await expect(
      service.pushMessage(ownerId, lineUserId, messages),
    ).rejects.toThrow("LINE API Error");
  });

  // --- 境界値 ---

  it("messages 配列に1件のメッセージのみの場合に送信できること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockResolvedValue("msg-005");

    const messages = [PushMessage.createText("1件のみ")];
    const result = await service.pushMessage(ownerId, lineUserId, messages);

    expect(result.success).toBe(true);
    expect(messagingGateway.pushMessage).toHaveBeenCalledTimes(1);
  });

  it("messages 配列に5件(LINE API 上限)のメッセージを送信できること", async () => {
    vi.mocked(messagingGateway.pushMessage).mockResolvedValue("msg-006");

    const messages = [
      PushMessage.createText("メッセージ1"),
      PushMessage.createText("メッセージ2"),
      PushMessage.createText("メッセージ3"),
      PushMessage.createText("メッセージ4"),
      PushMessage.createText("メッセージ5"),
    ];
    const result = await service.pushMessage(ownerId, lineUserId, messages);

    expect(result.success).toBe(true);
  });
});
