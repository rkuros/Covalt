/**
 * Unit 4 から受信する予約イベントペイロードを表す不変オブジェクト。
 * 3 種類のイベント（created / modified / cancelled）を型安全に表現する。
 */

/** 全イベント共通フィールド */
interface ReservationEventBase {
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly lineUserId: string | null;
  readonly ownerLineUserId: string | null;
  readonly slotId: string;
  readonly dateTime: string;
  readonly timestamp: string;
}

/** 予約作成イベント */
export interface ReservationCreatedEvent extends ReservationEventBase {
  readonly eventType: "reservation.created";
}

/** 予約変更イベント */
export interface ReservationModifiedEvent extends ReservationEventBase {
  readonly eventType: "reservation.modified";
  readonly previousDateTime: string;
  readonly modifiedBy: "customer" | "owner";
}

/** 予約キャンセルイベント */
export interface ReservationCancelledEvent extends ReservationEventBase {
  readonly eventType: "reservation.cancelled";
  readonly cancelledBy: "customer" | "owner";
}

/** 予約イベントの Union 型 */
export type ReservationEvent =
  | ReservationCreatedEvent
  | ReservationModifiedEvent
  | ReservationCancelledEvent;

/** イベント種別の文字列リテラル */
export type ReservationEventType = ReservationEvent["eventType"];

/**
 * 生の JSON ペイロードから ReservationEvent を生成するファクトリ。
 * 必須フィールドの存在とイベント種別の妥当性を検証する。
 */
export function parseReservationEvent(payload: unknown): ReservationEvent {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("イベントペイロードがオブジェクトではありません");
  }

  const obj = payload as Record<string, unknown>;

  const requiredBase = [
    "eventType",
    "reservationId",
    "ownerId",
    "customerId",
    "customerName",
    "slotId",
    "dateTime",
    "timestamp",
  ] as const;

  for (const field of requiredBase) {
    if (typeof obj[field] !== "string") {
      throw new Error(`必須フィールド '${field}' が不足または不正です`);
    }
  }

  // lineUserId / ownerLineUserId は null 許容
  const nullableFields = ["lineUserId", "ownerLineUserId"] as const;
  for (const field of nullableFields) {
    if (obj[field] !== null && typeof obj[field] !== "string") {
      throw new Error(`フィールド '${field}' は文字列またはnullである必要があります`);
    }
  }

  const base = {
    reservationId: obj["reservationId"] as string,
    ownerId: obj["ownerId"] as string,
    customerId: obj["customerId"] as string,
    customerName: obj["customerName"] as string,
    lineUserId: (obj["lineUserId"] as string | null),
    ownerLineUserId: (obj["ownerLineUserId"] as string | null),
    slotId: obj["slotId"] as string,
    dateTime: obj["dateTime"] as string,
    timestamp: obj["timestamp"] as string,
  };

  switch (obj["eventType"]) {
    case "reservation.created":
      return Object.freeze({
        ...base,
        eventType: "reservation.created" as const,
      });

    case "reservation.modified":
      if (typeof obj["previousDateTime"] !== "string") {
        throw new Error(
          "reservation.modified には 'previousDateTime' が必要です"
        );
      }
      if (obj["modifiedBy"] !== "customer" && obj["modifiedBy"] !== "owner") {
        throw new Error(
          "reservation.modified の 'modifiedBy' は 'customer' または 'owner' である必要があります"
        );
      }
      return Object.freeze({
        ...base,
        eventType: "reservation.modified" as const,
        previousDateTime: obj["previousDateTime"] as string,
        modifiedBy: obj["modifiedBy"] as "customer" | "owner",
      });

    case "reservation.cancelled":
      if (
        obj["cancelledBy"] !== "customer" &&
        obj["cancelledBy"] !== "owner"
      ) {
        throw new Error(
          "reservation.cancelled の 'cancelledBy' は 'customer' または 'owner' である必要があります"
        );
      }
      return Object.freeze({
        ...base,
        eventType: "reservation.cancelled" as const,
        cancelledBy: obj["cancelledBy"] as "customer" | "owner",
      });

    default:
      throw new Error(`未知のイベント種別: ${String(obj["eventType"])}`);
  }
}
