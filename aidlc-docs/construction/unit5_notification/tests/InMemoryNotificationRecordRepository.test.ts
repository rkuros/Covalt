import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryNotificationRecordRepository } from "../src/InMemoryNotificationRecordRepository";
import { NotificationRecord } from "../src/NotificationRecord";
import { NotificationType } from "../src/NotificationType";
import { RecipientType } from "../src/RecipientType";
import { SendResult } from "../src/SendResult";

describe("InMemoryNotificationRecordRepository", () => {
  let repository: InMemoryNotificationRecordRepository;

  const createRecord = (
    reservationId: string,
    recipientType: RecipientType
  ): NotificationRecord => {
    return NotificationRecord.create({
      reservationId,
      notificationType: NotificationType.Confirmation,
      recipientType,
      recipientLineUserId: "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
      ownerId: "owner-001",
      sendResult: SendResult.ok("msg-001"),
    });
  };

  beforeEach(() => {
    repository = new InMemoryNotificationRecordRepository();
  });

  it("NotificationRecord を保存できる", async () => {
    const record = createRecord("rsv-001", RecipientType.Customer);
    await repository.save(record);
    expect(repository.size).toBe(1);
  });

  it("reservationId で NotificationRecord を検索できる", async () => {
    const record1 = createRecord("rsv-001", RecipientType.Customer);
    const record2 = createRecord("rsv-001", RecipientType.Owner);
    const record3 = createRecord("rsv-002", RecipientType.Customer);

    await repository.save(record1);
    await repository.save(record2);
    await repository.save(record3);

    const results = await repository.findByReservationId("rsv-001");
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.reservationId === "rsv-001")).toBe(true);
  });

  it("存在しない reservationId で検索した場合、空配列を返す", async () => {
    const results = await repository.findByReservationId("rsv-nonexistent");
    expect(results).toHaveLength(0);
  });

  it("clear で全レコードをクリアできる", async () => {
    await repository.save(createRecord("rsv-001", RecipientType.Customer));
    await repository.save(createRecord("rsv-002", RecipientType.Owner));
    expect(repository.size).toBe(2);

    repository.clear();
    expect(repository.size).toBe(0);
  });
});
