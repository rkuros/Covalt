import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReservationEventHandler } from "../src/ReservationEventHandler";
import { NotificationDispatcher } from "../src/NotificationDispatcher";
import { NotificationTemplateResolver } from "../src/NotificationTemplateResolver";
import { ReminderScheduler } from "../src/ReminderScheduler";
import { InMemoryNotificationRecordRepository } from "../src/InMemoryNotificationRecordRepository";
import { LineMessageSender } from "../src/LineMessageSender";
import { SendResult, SendErrorType } from "../src/SendResult";
import { RecipientType } from "../src/RecipientType";
import {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from "../src/ReservationEvent";

/** 共通ベースフィールド */
const baseFields = {
  reservationId: "rsv-001",
  ownerId: "owner-001",
  customerId: "cust-001",
  customerName: "テスト太郎",
  lineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  ownerLineUserId: "Uf1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4",
  slotId: "slot-001",
  dateTime: "2026-04-10T10:00:00+09:00",
  timestamp: "2026-03-07T12:00:00Z",
};

const createdEvent: ReservationCreatedEvent = {
  eventType: "reservation.created",
  ...baseFields,
};

const modifiedEvent: ReservationModifiedEvent = {
  eventType: "reservation.modified",
  ...baseFields,
  dateTime: "2026-04-15T14:00:00+09:00",
  previousDateTime: "2026-04-10T10:00:00+09:00",
  modifiedBy: "customer",
};

const cancelledEvent: ReservationCancelledEvent = {
  eventType: "reservation.cancelled",
  ...baseFields,
  cancelledBy: "customer",
};

describe("統合テスト -- イベント受信から通知送信までの一連のフロー", () => {
  let mockSender: LineMessageSender;
  let recordRepository: InMemoryNotificationRecordRepository;
  let reminderScheduler: ReminderScheduler;
  let handler: ReservationEventHandler;

  beforeEach(() => {
    mockSender = {
      send: vi.fn().mockResolvedValue(SendResult.ok("msg-001")),
    };
    recordRepository = new InMemoryNotificationRecordRepository();
    reminderScheduler = new ReminderScheduler();
    const templateResolver = new NotificationTemplateResolver();
    const dispatcher = new NotificationDispatcher(
      templateResolver,
      mockSender,
      recordRepository
    );
    handler = new ReservationEventHandler(dispatcher, reminderScheduler);
  });

  // --- 正常系 ---

  describe("正常系", () => {
    it("reservation.created イベント受信 -> テンプレート選択 -> 顧客向け送信成功 + オーナー向け送信成功 -> NotificationRecord 2 件記録", async () => {
      await handler.handle(createdEvent);

      // 2 通の送信が行われたことを確認
      expect(mockSender.send).toHaveBeenCalledTimes(2);

      // NotificationRecord が 2 件記録される
      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(2);

      // 顧客向けとオーナー向けがそれぞれ存在
      const customerRecord = records.find(
        (r) => r.recipientType === RecipientType.Customer
      );
      const ownerRecord = records.find(
        (r) => r.recipientType === RecipientType.Owner
      );
      expect(customerRecord).toBeDefined();
      expect(ownerRecord).toBeDefined();
      expect(customerRecord!.sendResult.success).toBe(true);
      expect(ownerRecord!.sendResult.success).toBe(true);

      // リマインダーが登録されている
      const schedule = reminderScheduler.getSchedule("rsv-001");
      expect(schedule).toBeDefined();
    });

    it("reservation.modified イベント受信 -> テンプレート選択 -> 顧客向け変更通知送信成功 + オーナー向け変更通知送信成功 -> リマインダー再登録", async () => {
      // まず created
      await handler.handle(createdEvent);
      const originalSchedule = reminderScheduler.getSchedule("rsv-001");
      expect(originalSchedule).toBeDefined();

      // modified
      await handler.handle(modifiedEvent);

      // 変更通知が送信される（created の 2 通 + modified の 2 通 = 4 通）
      expect(mockSender.send).toHaveBeenCalledTimes(4);

      // リマインダーが新しい日時で再登録されている
      const newSchedule = reminderScheduler.getSchedule("rsv-001");
      expect(newSchedule).toBeDefined();
      expect(newSchedule!.dateTime).toBe("2026-04-15T14:00:00+09:00");

      // NotificationRecord が 4 件記録される（created 2 + modified 2）
      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(4);
    });

    it("reservation.cancelled イベント受信 -> テンプレート選択 -> 顧客向けキャンセル通知送信成功 + オーナー向けキャンセル通知送信成功 -> リマインダー削除", async () => {
      // まず created
      await handler.handle(createdEvent);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeDefined();

      // cancelled
      await handler.handle(cancelledEvent);

      // キャンセル通知が送信される（created 2 + cancelled 2 = 4 通）
      expect(mockSender.send).toHaveBeenCalledTimes(4);

      // リマインダーが削除されている
      expect(reminderScheduler.getSchedule("rsv-001")).toBeUndefined();

      // NotificationRecord が 4 件記録される（created 2 + cancelled 2）
      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(4);
    });
  });

  // --- 異常系 ---

  describe("異常系", () => {
    it("reservation.created イベント受信 -> 顧客がブロック済み -> 顧客向け送信は USER_BLOCKED で記録、オーナー向け送信は成功", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(SendResult.fail(SendErrorType.UserBlocked))
        .mockResolvedValueOnce(SendResult.ok("msg-owner"));

      await handler.handle(createdEvent);

      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(2);

      const customerRecord = records.find(
        (r) => r.recipientType === RecipientType.Customer
      );
      const ownerRecord = records.find(
        (r) => r.recipientType === RecipientType.Owner
      );

      expect(customerRecord!.sendResult.isUserBlocked).toBe(true);
      expect(ownerRecord!.sendResult.success).toBe(true);
    });

    it("reservation.created イベント受信 -> オーナーがブロック済み -> オーナー向け送信は USER_BLOCKED で記録、顧客向け送信は成功", async () => {
      (mockSender.send as any)
        .mockResolvedValueOnce(SendResult.ok("msg-customer"))
        .mockResolvedValueOnce(SendResult.fail(SendErrorType.UserBlocked));

      await handler.handle(createdEvent);

      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(2);

      const customerRecord = records.find(
        (r) => r.recipientType === RecipientType.Customer
      );
      const ownerRecord = records.find(
        (r) => r.recipientType === RecipientType.Owner
      );

      expect(customerRecord!.sendResult.success).toBe(true);
      expect(ownerRecord!.sendResult.isUserBlocked).toBe(true);
    });

    it("reservation.created イベント受信 -> 顧客・オーナー両方がブロック済み -> 両方とも USER_BLOCKED で記録、処理は正常終了", async () => {
      (mockSender.send as any).mockResolvedValue(
        SendResult.fail(SendErrorType.UserBlocked)
      );

      // 例外を投げずに正常終了する
      await expect(handler.handle(createdEvent)).resolves.not.toThrow();

      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(2);

      for (const record of records) {
        expect(record.sendResult.isUserBlocked).toBe(true);
      }
    });

    it("reservation.cancelled イベント受信後にリマインダーが発火しないことの確認（BR-1, BR-2）", async () => {
      // created でスケジュール登録
      await handler.handle(createdEvent);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeDefined();

      // cancelled でスケジュール削除
      await handler.handle(cancelledEvent);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeUndefined();

      // getDueReminders にキャンセル済み予約のリマインダーが含まれない
      const dueReminders = reminderScheduler.getDueReminders(
        new Date("2026-04-10T00:00:00Z")
      );
      const found = dueReminders.find((r) => r.reservationId === "rsv-001");
      expect(found).toBeUndefined();
    });
  });

  // --- 境界値 ---

  describe("境界値", () => {
    it("1 つの予約に対して created -> modified -> cancelled の順にイベントが発生した場合、リマインダースケジュールが最終的に削除されている", async () => {
      // created: スケジュール登録
      await handler.handle(createdEvent);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeDefined();

      // modified: スケジュール再登録
      await handler.handle(modifiedEvent);
      const modifiedSchedule = reminderScheduler.getSchedule("rsv-001");
      expect(modifiedSchedule).toBeDefined();
      expect(modifiedSchedule!.dateTime).toBe("2026-04-15T14:00:00+09:00");

      // cancelled: スケジュール削除
      await handler.handle(cancelledEvent);
      expect(reminderScheduler.getSchedule("rsv-001")).toBeUndefined();

      // 合計送信回数: created(2) + modified(2) + cancelled(2) = 6
      expect(mockSender.send).toHaveBeenCalledTimes(6);

      // 全 NotificationRecord を確認
      const records = await recordRepository.findByReservationId("rsv-001");
      expect(records).toHaveLength(6);
    });
  });
});
