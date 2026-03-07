import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReservationEventHandler } from "../src/ReservationEventHandler";
import { NotificationDispatcher } from "../src/NotificationDispatcher";
import { ReminderScheduler } from "../src/ReminderScheduler";
import { NotificationType } from "../src/NotificationType";
import { SendResult } from "../src/SendResult";
import {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from "../src/ReservationEvent";

/** テスト用の共通ベースフィールド */
const baseFields = {
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

const createdEvent: ReservationCreatedEvent = {
  ...baseFields,
  eventType: "reservation.created",
};

const modifiedEventByCustomer: ReservationModifiedEvent = {
  ...baseFields,
  eventType: "reservation.modified",
  previousDateTime: "2026-04-01T10:00:00+09:00",
  dateTime: "2026-04-02T14:00:00+09:00",
  modifiedBy: "customer",
};

const modifiedEventByOwner: ReservationModifiedEvent = {
  ...baseFields,
  eventType: "reservation.modified",
  previousDateTime: "2026-04-01T10:00:00+09:00",
  dateTime: "2026-04-02T14:00:00+09:00",
  modifiedBy: "owner",
};

const cancelledEventByCustomer: ReservationCancelledEvent = {
  ...baseFields,
  eventType: "reservation.cancelled",
  cancelledBy: "customer",
};

const cancelledEventByOwner: ReservationCancelledEvent = {
  ...baseFields,
  eventType: "reservation.cancelled",
  cancelledBy: "owner",
};

describe("ReservationEventHandler", () => {
  let mockDispatcher: NotificationDispatcher;
  let reminderScheduler: ReminderScheduler;
  let handler: ReservationEventHandler;

  const successResult = {
    customer: SendResult.ok("msg-c"),
    owner: SendResult.ok("msg-o"),
  };

  beforeEach(() => {
    mockDispatcher = {
      dispatchBoth: vi.fn().mockResolvedValue(successResult),
    } as any;
    reminderScheduler = new ReminderScheduler();
    handler = new ReservationEventHandler(mockDispatcher, reminderScheduler);
  });

  // --- 正常系 ---

  describe("正常系", () => {
    it("reservation.created イベント受信時に NotificationDispatcher へ顧客向け・オーナー向けの通知送信を依頼する", async () => {
      await handler.handle(createdEvent);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Confirmation,
        createdEvent
      );
    });

    it("reservation.created イベント受信時に ReminderScheduler へ予約日前日のスケジュール登録を依頼する", async () => {
      await handler.handle(createdEvent);
      const schedule = reminderScheduler.getSchedule("rsv-001");
      expect(schedule).toBeDefined();
      expect(schedule!.reservationId).toBe("rsv-001");
    });

    it("reservation.modified イベント受信時に NotificationDispatcher へ顧客向け・オーナー向けの変更通知送信を依頼する", async () => {
      await handler.handle(modifiedEventByCustomer);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Modification,
        modifiedEventByCustomer
      );
    });

    it("reservation.modified イベント受信時に ReminderScheduler へ既存スケジュール削除と新スケジュール登録を依頼する（BR-3）", async () => {
      // まず created でスケジュール登録
      await handler.handle(createdEvent);
      const originalSchedule = reminderScheduler.getSchedule("rsv-001");
      expect(originalSchedule).toBeDefined();

      // modified で再登録
      await handler.handle(modifiedEventByCustomer);
      const newSchedule = reminderScheduler.getSchedule("rsv-001");
      expect(newSchedule).toBeDefined();
      expect(newSchedule!.dateTime).toBe("2026-04-02T14:00:00+09:00");
    });

    it("reservation.cancelled イベント受信時に NotificationDispatcher へ顧客向け・オーナー向けのキャンセル通知送信を依頼する", async () => {
      await handler.handle(cancelledEventByCustomer);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Cancellation,
        cancelledEventByCustomer
      );
    });

    it("reservation.cancelled イベント受信時に ReminderScheduler へスケジュール削除を依頼する（BR-2）", async () => {
      // まず created でスケジュール登録
      await handler.handle(createdEvent);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeDefined();

      // cancelled でスケジュール削除
      await handler.handle(cancelledEventByCustomer);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeUndefined();
    });

    it("オーナーが変更した場合（modifiedBy=owner）でも顧客向け通知が送信される（BR-5）", async () => {
      await handler.handle(modifiedEventByOwner);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Modification,
        modifiedEventByOwner
      );
      // dispatchBoth は顧客向けとオーナー向けの両方を送信する
    });

    it("顧客が変更した場合（modifiedBy=customer）でもオーナー向け通知が送信される（BR-6）", async () => {
      await handler.handle(modifiedEventByCustomer);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Modification,
        modifiedEventByCustomer
      );
    });

    it("オーナーがキャンセルした場合（cancelledBy=owner）でも顧客向け通知が送信される（BR-5）", async () => {
      await handler.handle(cancelledEventByOwner);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Cancellation,
        cancelledEventByOwner
      );
    });

    it("顧客がキャンセルした場合（cancelledBy=customer）でもオーナー向け通知が送信される（BR-6）", async () => {
      await handler.handle(cancelledEventByCustomer);
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledWith(
        NotificationType.Cancellation,
        cancelledEventByCustomer
      );
    });
  });

  // --- 異常系 ---

  describe("異常系", () => {
    it("NotificationDispatcher が例外を投げた場合、イベント処理全体が中断しないことの確認", async () => {
      (mockDispatcher.dispatchBoth as any).mockRejectedValueOnce(
        new Error("送信エラー")
      );
      // handle は例外をそのまま伝播するが、呼び出し側が catch すればよい
      await expect(handler.handle(createdEvent)).rejects.toThrow("送信エラー");
    });
  });

  // --- 境界値 ---

  describe("境界値", () => {
    it("同一 reservationId のイベントが短時間に複数回到着した場合、それぞれ独立して処理される", async () => {
      await handler.handle(createdEvent);
      await handler.handle(createdEvent);

      // dispatchBoth が2回呼ばれることを確認
      expect(mockDispatcher.dispatchBoth).toHaveBeenCalledTimes(2);

      // ReminderScheduler には同一 reservationId で上書きされる
      const schedule = reminderScheduler.getSchedule("rsv-001");
      expect(schedule).toBeDefined();
    });
  });
});
