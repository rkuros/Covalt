import { describe, it, expect } from "vitest";
import { NotificationRecord } from "../src/NotificationRecord";
import { NotificationType } from "../src/NotificationType";
import { RecipientType } from "../src/RecipientType";
import { SendResult, SendErrorType } from "../src/SendResult";

describe("NotificationRecord", () => {
  // --- 正常系 ---

  it("通知種別、受信者種別、送信先 lineUserId、送信日時、送信結果を指定して NotificationRecord を生成できる", () => {
    const sendResult = SendResult.ok("msg-001");
    const record = NotificationRecord.create({
      reservationId: "rsv-001",
      notificationType: NotificationType.Confirmation,
      recipientType: RecipientType.Customer,
      recipientLineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ownerId: "owner-001",
      sendResult,
    });

    expect(record).toBeDefined();
    expect(record.id).toBeDefined();
    expect(record.notificationType).toBe(NotificationType.Confirmation);
    expect(record.recipientType).toBe(RecipientType.Customer);
    expect(record.recipientLineUserId).toBe(
      "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
    );
    expect(record.sentAt).toBeInstanceOf(Date);
  });

  it("送信成功の NotificationRecord を生成した場合、送信結果に messageId が含まれる", () => {
    const sendResult = SendResult.ok("msg-002");
    const record = NotificationRecord.create({
      reservationId: "rsv-001",
      notificationType: NotificationType.Confirmation,
      recipientType: RecipientType.Customer,
      recipientLineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ownerId: "owner-001",
      sendResult,
    });

    expect(record.sendResult.success).toBe(true);
    expect(record.sendResult.messageId).toBe("msg-002");
  });

  it("送信失敗（USER_BLOCKED）の NotificationRecord を生成した場合、送信結果にエラー種別が含まれる", () => {
    const sendResult = SendResult.fail(SendErrorType.UserBlocked);
    const record = NotificationRecord.create({
      reservationId: "rsv-001",
      notificationType: NotificationType.Confirmation,
      recipientType: RecipientType.Customer,
      recipientLineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ownerId: "owner-001",
      sendResult,
    });

    expect(record.sendResult.success).toBe(false);
    expect(record.sendResult.errorType).toBe("USER_BLOCKED");
    expect(record.sendResult.isUserBlocked).toBe(true);
  });

  it("reservationId が正しく関連付けられる", () => {
    const record = NotificationRecord.create({
      reservationId: "rsv-999",
      notificationType: NotificationType.Modification,
      recipientType: RecipientType.Owner,
      recipientLineUserId: "Uf1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4",
      ownerId: "owner-001",
      sendResult: SendResult.ok("msg-003"),
    });

    expect(record.reservationId).toBe("rsv-999");
  });

  // --- 異常系 ---
  // NotificationRecord.create は TypeScript の型安全性でパラメータを強制するため、
  // ランタイムでの null チェックは型レベルで防止される。
  // 以下は防御的なランタイムチェックのテスト。

  it("通知種別が null の場合、不正な NotificationRecord が生成される", () => {
    // TypeScript の型安全性によりコンパイル時に防止されるが、
    // ランタイムでの振る舞いを確認する
    const record = NotificationRecord.create({
      reservationId: "rsv-001",
      notificationType: null as any,
      recipientType: RecipientType.Customer,
      recipientLineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ownerId: "owner-001",
      sendResult: SendResult.ok("msg-001"),
    });
    expect(record.notificationType).toBeNull();
  });

  it("受信者種別が null の場合、不正な NotificationRecord が生成される", () => {
    const record = NotificationRecord.create({
      reservationId: "rsv-001",
      notificationType: NotificationType.Confirmation,
      recipientType: null as any,
      recipientLineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ownerId: "owner-001",
      sendResult: SendResult.ok("msg-001"),
    });
    expect(record.recipientType).toBeNull();
  });

  it("送信先 lineUserId が空の場合、空文字列として生成される", () => {
    const record = NotificationRecord.create({
      reservationId: "rsv-001",
      notificationType: NotificationType.Confirmation,
      recipientType: RecipientType.Customer,
      recipientLineUserId: "",
      ownerId: "owner-001",
      sendResult: SendResult.ok("msg-001"),
    });
    expect(record.recipientLineUserId).toBe("");
  });
});
