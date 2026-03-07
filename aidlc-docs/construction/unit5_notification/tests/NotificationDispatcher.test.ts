import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationDispatcher } from "../src/NotificationDispatcher";
import { NotificationTemplateResolver } from "../src/NotificationTemplateResolver";
import { LineMessageSender } from "../src/LineMessageSender";
import { InMemoryNotificationRecordRepository } from "../src/InMemoryNotificationRecordRepository";
import { NotificationType } from "../src/NotificationType";
import { RecipientType } from "../src/RecipientType";
import { SendResult, SendErrorType } from "../src/SendResult";
import { NotificationMessage } from "../src/NotificationMessage";
import { ReservationCreatedEvent } from "../src/ReservationEvent";

/** テスト用の reservation.created イベント */
const createdEvent: ReservationCreatedEvent = {
  eventType: "reservation.created",
  reservationId: "rsv-001",
  ownerId: "owner-001",
  customerId: "cust-001",
  customerName: "テスト太郎",
  lineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  ownerLineUserId: "Uf1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4",
  slotId: "slot-001",
  dateTime: "2026-04-01T10:00:00+09:00",
  timestamp: "2026-03-07T12:00:00Z",
};

describe("NotificationDispatcher", () => {
  let templateResolver: NotificationTemplateResolver;
  let mockSender: LineMessageSender;
  let recordRepository: InMemoryNotificationRecordRepository;
  let dispatcher: NotificationDispatcher;

  beforeEach(() => {
    templateResolver = new NotificationTemplateResolver();
    mockSender = {
      send: vi.fn().mockResolvedValue(SendResult.ok("msg-001")),
    };
    recordRepository = new InMemoryNotificationRecordRepository();
    dispatcher = new NotificationDispatcher(
      templateResolver,
      mockSender,
      recordRepository
    );
  });

  // --- 正常系 ---

  describe("正常系", () => {
    it("reservation.created イベントに対して、顧客向けとオーナー向けの 2 通の通知を送信する", async () => {
      await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );
      expect(mockSender.send).toHaveBeenCalledTimes(2);
    });

    it("NotificationTemplateResolver を呼び出して適切なテンプレートでメッセージを生成する", async () => {
      const resolveSpy = vi.spyOn(templateResolver, "resolve");
      await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );
      expect(resolveSpy).toHaveBeenCalledTimes(2);
      expect(resolveSpy).toHaveBeenCalledWith(
        NotificationType.Confirmation,
        RecipientType.Customer,
        createdEvent
      );
      expect(resolveSpy).toHaveBeenCalledWith(
        NotificationType.Confirmation,
        RecipientType.Owner,
        createdEvent
      );
    });

    it("LineMessageSender を呼び出してメッセージを送信する", async () => {
      await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );
      // 顧客向け送信
      expect(mockSender.send).toHaveBeenCalledWith(
        "owner-001",
        "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
        expect.arrayContaining([
          expect.objectContaining({ type: "text" }),
        ])
      );
      // オーナー向け送信
      expect(mockSender.send).toHaveBeenCalledWith(
        "owner-001",
        "Uf1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4",
        expect.arrayContaining([
          expect.objectContaining({ type: "text" }),
        ])
      );
    });

    it("送信成功時に NotificationRecord を生成して記録する", async () => {
      await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );
      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(2);
      expect(
        records.some((r) => r.recipientType === RecipientType.Customer)
      ).toBe(true);
      expect(
        records.some((r) => r.recipientType === RecipientType.Owner)
      ).toBe(true);
    });

    it("顧客向け送信が失敗しても、オーナー向け送信は独立して実行される", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(
          SendResult.fail(SendErrorType.NetworkError, "接続エラー")
        )
        .mockResolvedValueOnce(SendResult.ok("msg-owner"));

      const result = await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );

      // 顧客向けは失敗、オーナー向けは成功
      expect(result.customer.success).toBe(false);
      expect(result.owner.success).toBe(true);
      expect(mockSender.send).toHaveBeenCalledTimes(2);
    });

    it("オーナー向け送信が失敗しても、顧客向け送信は独立して実行される", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(SendResult.ok("msg-customer"))
        .mockResolvedValueOnce(
          SendResult.fail(SendErrorType.NetworkError, "接続エラー")
        );

      const result = await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );

      expect(result.customer.success).toBe(true);
      expect(result.owner.success).toBe(false);
      expect(mockSender.send).toHaveBeenCalledTimes(2);
    });
  });

  // --- 異常系: ブロック済みユーザー (BR-7) ---

  describe("異常系 -- ブロック済みユーザー（BR-7）", () => {
    it("顧客が LINE アカウントをブロック済み（USER_BLOCKED）の場合、エラーを記録し処理を正常終了とする", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(SendResult.fail(SendErrorType.UserBlocked))
        .mockResolvedValueOnce(SendResult.ok("msg-owner"));

      const result = await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );

      expect(result.customer.success).toBe(false);
      expect(result.customer.isUserBlocked).toBe(true);

      // 記録が保存されている
      const records = await recordRepository.findByReservationId("rsv-001");
      const customerRecord = records.find(
        (r) => r.recipientType === RecipientType.Customer
      );
      expect(customerRecord).toBeDefined();
      expect(customerRecord!.sendResult.isUserBlocked).toBe(true);
    });

    it("ブロック済みユーザーへの送信失敗時にリトライしない", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(SendResult.fail(SendErrorType.UserBlocked))
        .mockResolvedValueOnce(SendResult.ok("msg-owner"));

      await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );

      // 顧客向け送信は1回のみ（リトライしていない）
      const customerCalls = (mockSender.send as any).mock.calls.filter(
        (call: any[]) =>
          call[1] === "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
      );
      expect(customerCalls).toHaveLength(1);
    });

    it("顧客がブロック済みでもオーナー向け送信は正常に実行される", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(SendResult.fail(SendErrorType.UserBlocked))
        .mockResolvedValueOnce(SendResult.ok("msg-owner"));

      const result = await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );

      expect(result.customer.isUserBlocked).toBe(true);
      expect(result.owner.success).toBe(true);
      expect(result.owner.messageId).toBe("msg-owner");
    });
  });

  // --- 異常系: 一時的エラー (BR-8) ---

  describe("異常系 -- 一時的エラー（BR-8）", () => {
    it("ネットワークエラー等の一時的な送信失敗の場合、失敗の SendResult が返される", async () => {
      (mockSender.send as any).mockResolvedValue(
        SendResult.fail(SendErrorType.NetworkError, "タイムアウト")
      );

      const result = await dispatcher.dispatchBoth(
        NotificationType.Confirmation,
        createdEvent
      );

      expect(result.customer.success).toBe(false);
      expect(result.customer.errorType).toBe("NETWORK_ERROR");
      // リトライ処理は LineMessageSender 側の責務
      // NotificationDispatcher はリトライ後の最終結果を受け取る
    });
  });
});
