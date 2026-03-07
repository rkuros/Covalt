import { describe, it, expect } from "vitest";
import { NotificationType } from "../src/NotificationType";

describe("NotificationType", () => {
  // --- 正常系 ---

  it("confirmation を指定して NotificationType を生成できる", () => {
    const type: NotificationType = NotificationType.Confirmation;
    expect(type).toBe("confirmation");
  });

  it("modification を指定して NotificationType を生成できる", () => {
    const type: NotificationType = NotificationType.Modification;
    expect(type).toBe("modification");
  });

  it("cancellation を指定して NotificationType を生成できる", () => {
    const type: NotificationType = NotificationType.Cancellation;
    expect(type).toBe("cancellation");
  });

  it("reminder を指定して NotificationType を生成できる", () => {
    const type: NotificationType = NotificationType.Reminder;
    expect(type).toBe("reminder");
  });

  it("同じ種別を持つ NotificationType 同士は等価と判定される", () => {
    const a: NotificationType = NotificationType.Confirmation;
    const b: NotificationType = NotificationType.Confirmation;
    expect(a).toBe(b);
  });

  // --- 異常系 ---

  it('定義されていない種別文字列（例: "unknown"）を指定した場合、エラーとなる', () => {
    const validValues = Object.values(NotificationType);
    expect(validValues).not.toContain("unknown");
  });

  it("空文字列を指定した場合、エラーとなる", () => {
    const validValues = Object.values(NotificationType);
    expect(validValues).not.toContain("");
  });

  it("null / undefined を指定した場合、エラーとなる", () => {
    const validValues = Object.values(NotificationType);
    expect(validValues).not.toContain(null);
    expect(validValues).not.toContain(undefined);
  });
});
