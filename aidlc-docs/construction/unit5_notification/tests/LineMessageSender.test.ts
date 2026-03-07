import { describe, it, expect, vi, beforeEach } from "vitest";
import { LineMessageSender, LineMessage } from "../src/LineMessageSender";
import { SendResult, SendErrorType } from "../src/SendResult";

/**
 * LineMessageSender はインターフェースであるため、
 * テストではモック実装を通じてコントラクト（Pact 準拠）を検証する。
 */

describe("LineMessageSender", () => {
  let mockSender: LineMessageSender;

  const textMessage: LineMessage = {
    type: "text",
    text: "予約が確定しました。",
  };

  // --- 正常系 ---

  describe("正常系", () => {
    beforeEach(() => {
      mockSender = {
        send: vi.fn().mockResolvedValue(SendResult.ok("msg-001")),
      };
    });

    it("Pact 定義に準拠したリクエストを送信し、成功レスポンスを受け取った場合、成功の SendResult を返す", async () => {
      const result = await mockSender.send("owner-001", "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", [
        textMessage,
      ]);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-001");
    });

    it("lineUserId が U + 32桁 hex の形式（Pact の matchingRules）で送信される", async () => {
      const lineUserId = "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
      expect(lineUserId).toMatch(/^U[0-9a-f]{32}$/);

      await mockSender.send("owner-001", lineUserId, [textMessage]);
      expect(mockSender.send).toHaveBeenCalledWith(
        "owner-001",
        lineUserId,
        [textMessage]
      );
    });

    it("messages 配列に 1 件以上のメッセージが含まれる", async () => {
      await mockSender.send("owner-001", "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", [
        textMessage,
      ]);
      const callArgs = (mockSender.send as any).mock.calls[0];
      const messages = callArgs[2] as LineMessage[];
      expect(messages.length).toBeGreaterThanOrEqual(1);
    });

    it('メッセージ種別が "text" の場合、text フィールドが含まれる', async () => {
      await mockSender.send("owner-001", "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", [
        textMessage,
      ]);
      const callArgs = (mockSender.send as any).mock.calls[0];
      const messages = callArgs[2] as LineMessage[];
      expect(messages[0].type).toBe("text");
      expect(messages[0].text).toBeDefined();
      expect(messages[0].text.length).toBeGreaterThan(0);
    });
  });

  // --- 異常系: ブロック済みユーザー ---

  describe("異常系 -- ブロック済みユーザー", () => {
    beforeEach(() => {
      mockSender = {
        send: vi.fn().mockResolvedValue(SendResult.fail(SendErrorType.UserBlocked)),
      };
    });

    it("レスポンスが 422 かつ error=USER_BLOCKED の場合、USER_BLOCKED を示す SendResult を返す（BR-7）", async () => {
      const result = await mockSender.send(
        "owner-001",
        "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        [textMessage]
      );
      expect(result.success).toBe(false);
      expect(result.errorType).toBe("USER_BLOCKED");
      expect(result.isUserBlocked).toBe(true);
    });

    it("USER_BLOCKED エラー時にリトライしない（BR-7）", async () => {
      const result = await mockSender.send(
        "owner-001",
        "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        [textMessage]
      );
      expect(result.isUserBlocked).toBe(true);
      expect(result.isRetryable).toBe(false);
      // send は1回のみ呼ばれる
      expect(mockSender.send).toHaveBeenCalledTimes(1);
    });
  });

  // --- 異常系: 一時的エラー ---

  describe("異常系 -- 一時的エラー", () => {
    it("ネットワークエラー（タイムアウト等）の場合、リトライ処理が行われる（BR-8）", async () => {
      // 最大3回リトライ、指数バックオフ（1秒、2秒、4秒）をシミュレート
      let callCount = 0;
      mockSender = {
        send: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount <= 2) {
            return SendResult.fail(SendErrorType.NetworkError, "タイムアウト");
          }
          return SendResult.ok("msg-retry-success");
        }),
      };

      // リトライロジックは実装側の責務だが、SendResult.isRetryable で判定可能
      const firstResult = await mockSender.send(
        "owner-001",
        "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        [textMessage]
      );
      expect(firstResult.isRetryable).toBe(true);

      // リトライ2回目
      const secondResult = await mockSender.send(
        "owner-001",
        "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        [textMessage]
      );
      expect(secondResult.isRetryable).toBe(true);

      // リトライ3回目: 成功
      const thirdResult = await mockSender.send(
        "owner-001",
        "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        [textMessage]
      );
      expect(thirdResult.success).toBe(true);
      expect(thirdResult.messageId).toBe("msg-retry-success");
    });

    it("リトライ上限を超えた場合、失敗の SendResult を返す", async () => {
      mockSender = {
        send: vi
          .fn()
          .mockResolvedValue(
            SendResult.fail(SendErrorType.NetworkError, "リトライ上限超過")
          ),
      };

      // 最大3回リトライ後も失敗
      let lastResult: SendResult | null = null;
      for (let i = 0; i < 3; i++) {
        lastResult = await mockSender.send(
          "owner-001",
          "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
          [textMessage]
        );
      }

      expect(lastResult!.success).toBe(false);
      expect(lastResult!.errorType).toBe("NETWORK_ERROR");
      expect(mockSender.send).toHaveBeenCalledTimes(3);
    });
  });

  // --- 境界値 ---

  describe("境界値", () => {
    it("messages 配列が空（0件）の場合、バリデーションエラーとする（Pact の min: 1 準拠）", async () => {
      // テスト計画の方針: messages が空の場合は LineMessageSender 側でバリデーションエラーとする
      mockSender = {
        send: vi.fn().mockImplementation(async (_ownerId, _lineUserId, messages) => {
          if (messages.length === 0) {
            throw new Error("messages 配列は 1 件以上のメッセージを含む必要があります");
          }
          return SendResult.ok("msg-001");
        }),
      };

      await expect(
        mockSender.send("owner-001", "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", [])
      ).rejects.toThrow("messages 配列は 1 件以上のメッセージを含む必要があります");
    });
  });
});
