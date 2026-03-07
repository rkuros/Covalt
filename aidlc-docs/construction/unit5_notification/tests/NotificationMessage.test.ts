import { describe, it, expect } from "vitest";
import { NotificationMessage } from "../src/NotificationMessage";
import { NotificationType } from "../src/NotificationType";
import { RecipientType } from "../src/RecipientType";

describe("NotificationMessage", () => {
  // --- 正常系 ---

  it('メッセージ種別（"text"）と本文テキストを指定して生成できる', () => {
    const msg = NotificationMessage.create(
      NotificationType.Confirmation,
      RecipientType.Customer,
      "予約が確定しました。"
    );
    expect(msg).toBeDefined();
    expect(msg.body).toBe("予約が確定しました。");
  });

  it("生成後にフィールドを変更できない（不変性）", () => {
    const msg = NotificationMessage.create(
      NotificationType.Confirmation,
      RecipientType.Customer,
      "予約が確定しました。"
    );
    expect(() => {
      (msg as any).body = "変更された本文";
    }).toThrow();
  });

  it('種別が "text" 相当の場合、body フィールドに本文が保持される', () => {
    const msg = NotificationMessage.create(
      NotificationType.Reminder,
      RecipientType.Customer,
      "明日のご予約のリマインドです。"
    );
    expect(msg.body).toBe("明日のご予約のリマインドです。");
    expect(msg.notificationType).toBe(NotificationType.Reminder);
    expect(msg.recipientType).toBe(RecipientType.Customer);
  });

  // --- 異常系 ---

  it("メッセージ本文が空文字列の場合、エラーとなる", () => {
    expect(() =>
      NotificationMessage.create(
        NotificationType.Confirmation,
        RecipientType.Customer,
        ""
      )
    ).toThrow("メッセージ本文は空にできません");
  });

  it("メッセージ本文がスペースのみの場合、エラーとなる", () => {
    expect(() =>
      NotificationMessage.create(
        NotificationType.Confirmation,
        RecipientType.Customer,
        "   "
      )
    ).toThrow("メッセージ本文は空にできません");
  });

  it("メッセージ本文が null / undefined の場合、エラーとなる", () => {
    expect(() =>
      NotificationMessage.create(
        NotificationType.Confirmation,
        RecipientType.Customer,
        null as any
      )
    ).toThrow();

    expect(() =>
      NotificationMessage.create(
        NotificationType.Confirmation,
        RecipientType.Customer,
        undefined as any
      )
    ).toThrow();
  });
});
