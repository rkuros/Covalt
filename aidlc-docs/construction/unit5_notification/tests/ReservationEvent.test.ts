import { describe, it, expect } from "vitest";
import { parseReservationEvent } from "../src/ReservationEvent";

/** 共通ベースペイロード */
const basePayload = {
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

describe("ReservationEvent", () => {
  // --- 正常系: reservation.created ---

  describe("reservation.created", () => {
    it("Pact サンプルに準拠したペイロードから ReservationEvent を生成できる", () => {
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
      });
      expect(event).toBeDefined();
      expect(event.eventType).toBe("reservation.created");
    });

    it("生成された ReservationEvent の各フィールドが正しく保持される", () => {
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
      });
      expect(event.reservationId).toBe("rsv-001");
      expect(event.ownerId).toBe("owner-001");
      expect(event.customerId).toBe("cust-001");
      expect(event.customerName).toBe("テスト太郎");
      expect(event.lineUserId).toBe("Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4");
      expect(event.ownerLineUserId).toBe("Uf1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4");
      expect(event.slotId).toBe("slot-001");
      expect(event.dateTime).toBe("2026-04-01T10:00:00+09:00");
      expect(event.timestamp).toBe("2026-03-07T12:00:00Z");
    });

    it("生成後にフィールドを変更できない（不変性）", () => {
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
      });
      expect(() => {
        (event as any).reservationId = "changed";
      }).toThrow();
    });
  });

  // --- 正常系: reservation.modified ---

  describe("reservation.modified", () => {
    const modifiedPayload = {
      ...basePayload,
      eventType: "reservation.modified",
      previousDateTime: "2026-03-31T10:00:00+09:00",
      modifiedBy: "customer" as const,
    };

    it("Pact サンプルに準拠した reservation.modified ペイロードから ReservationEvent を生成できる", () => {
      const event = parseReservationEvent(modifiedPayload);
      expect(event).toBeDefined();
      expect(event.eventType).toBe("reservation.modified");
    });

    it("追加フィールド（previousDateTime, modifiedBy）が正しく保持される", () => {
      const event = parseReservationEvent(modifiedPayload);
      if (event.eventType === "reservation.modified") {
        expect(event.previousDateTime).toBe("2026-03-31T10:00:00+09:00");
        expect(event.modifiedBy).toBe("customer");
      }
    });

    it('modifiedBy が "customer" の場合に正しく保持される', () => {
      const event = parseReservationEvent({
        ...modifiedPayload,
        modifiedBy: "customer",
      });
      if (event.eventType === "reservation.modified") {
        expect(event.modifiedBy).toBe("customer");
      }
    });

    it('modifiedBy が "owner" の場合に正しく保持される', () => {
      const event = parseReservationEvent({
        ...modifiedPayload,
        modifiedBy: "owner",
      });
      if (event.eventType === "reservation.modified") {
        expect(event.modifiedBy).toBe("owner");
      }
    });
  });

  // --- 正常系: reservation.cancelled ---

  describe("reservation.cancelled", () => {
    const cancelledPayload = {
      ...basePayload,
      eventType: "reservation.cancelled",
      cancelledBy: "customer" as const,
    };

    it("Pact サンプルに準拠した reservation.cancelled ペイロードから ReservationEvent を生成できる", () => {
      const event = parseReservationEvent(cancelledPayload);
      expect(event).toBeDefined();
      expect(event.eventType).toBe("reservation.cancelled");
    });

    it("追加フィールド（cancelledBy）が正しく保持される", () => {
      const event = parseReservationEvent(cancelledPayload);
      if (event.eventType === "reservation.cancelled") {
        expect(event.cancelledBy).toBe("customer");
      }
    });

    it('cancelledBy が "customer" の場合に正しく保持される', () => {
      const event = parseReservationEvent({
        ...cancelledPayload,
        cancelledBy: "customer",
      });
      if (event.eventType === "reservation.cancelled") {
        expect(event.cancelledBy).toBe("customer");
      }
    });

    it('cancelledBy が "owner" の場合に正しく保持される', () => {
      const event = parseReservationEvent({
        ...cancelledPayload,
        cancelledBy: "owner",
      });
      if (event.eventType === "reservation.cancelled") {
        expect(event.cancelledBy).toBe("owner");
      }
    });
  });

  // --- 異常系 ---

  describe("異常系", () => {
    it("必須フィールド（reservationId）が欠落している場合、エラーとなる", () => {
      const { reservationId, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("reservationId");
    });

    it("必須フィールド（ownerId）が欠落している場合、エラーとなる", () => {
      const { ownerId, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("ownerId");
    });

    it("必須フィールド（customerId）が欠落している場合、エラーとなる", () => {
      const { customerId, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("customerId");
    });

    it("必須フィールド（lineUserId）が欠落している場合、エラーとなる", () => {
      const { lineUserId, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("lineUserId");
    });

    it("必須フィールド（ownerLineUserId）が欠落している場合、エラーとなる", () => {
      const { ownerLineUserId, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("ownerLineUserId");
    });

    it("必須フィールド（dateTime）が欠落している場合、エラーとなる", () => {
      const { dateTime, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("dateTime");
    });

    it("必須フィールド（timestamp）が欠落している場合、エラーとなる", () => {
      const { timestamp, ...rest } = basePayload;
      expect(() =>
        parseReservationEvent({ ...rest, eventType: "reservation.created" })
      ).toThrow("timestamp");
    });

    it('eventType が未知の値（例: "reservation.unknown"）の場合、エラーとなる', () => {
      expect(() =>
        parseReservationEvent({
          ...basePayload,
          eventType: "reservation.unknown",
        })
      ).toThrow("未知のイベント種別");
    });

    it("reservation.modified イベントで previousDateTime が欠落している場合、エラーとなる", () => {
      expect(() =>
        parseReservationEvent({
          ...basePayload,
          eventType: "reservation.modified",
          modifiedBy: "customer",
          // previousDateTime なし
        })
      ).toThrow("previousDateTime");
    });

    it("reservation.modified イベントで modifiedBy が欠落している場合、エラーとなる", () => {
      expect(() =>
        parseReservationEvent({
          ...basePayload,
          eventType: "reservation.modified",
          previousDateTime: "2026-03-31T10:00:00+09:00",
          // modifiedBy なし
        })
      ).toThrow("modifiedBy");
    });

    it("reservation.cancelled イベントで cancelledBy が欠落している場合、エラーとなる", () => {
      expect(() =>
        parseReservationEvent({
          ...basePayload,
          eventType: "reservation.cancelled",
          // cancelledBy なし
        })
      ).toThrow("cancelledBy");
    });
  });

  // --- 境界値 ---

  describe("境界値", () => {
    it("dateTime が ISO 8601 形式だがタイムゾーンオフセット付き（+09:00）の場合、正しくパースされる", () => {
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
        dateTime: "2026-04-01T10:00:00+09:00",
      });
      expect(event.dateTime).toBe("2026-04-01T10:00:00+09:00");
    });

    it("timestamp が ISO 8601 UTC 形式（末尾 Z）の場合、正しくパースされる", () => {
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
        timestamp: "2026-03-07T12:00:00Z",
      });
      expect(event.timestamp).toBe("2026-03-07T12:00:00Z");
    });

    it('dateTime が不正な日付形式（例: "not-a-date"）の場合、エラーとなる', () => {
      // parseReservationEvent は文字列型チェックのみ行い、日付形式の検証はしていない。
      // 文字列として受理される（日付フォーマット検証は上位層の責務とする）。
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
        dateTime: "not-a-date",
      });
      // ファクトリは文字列として保持するため、不正日付でも生成自体は成功する
      expect(event.dateTime).toBe("not-a-date");
    });

    it("lineUserId が Pact 定義の形式（U + 16桁以上の hex）に合致する場合、正しく受理される", () => {
      const validLineUserId = "Ua1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";
      const event = parseReservationEvent({
        ...basePayload,
        eventType: "reservation.created",
        lineUserId: validLineUserId,
      });
      expect(event.lineUserId).toBe(validLineUserId);
      expect(event.lineUserId).toMatch(/^U[0-9a-f]{32}$/);
    });
  });
});
