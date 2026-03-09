/**
 * ドメインイベント定義
 *
 * Unit 4 が発行する 3 種のイベント。
 * ペイロードは Unit 5（LINE 通知）と Unit 7（Google カレンダー連携）が必要とする
 * フィールドの和集合（スーパーセット）として定義する。
 */

/** 全イベント共通の基底型 */
export interface DomainEvent {
  readonly eventType: string;
  readonly timestamp: string; // ISO 8601 UTC
}

/**
 * ReservationCreated - 予約作成イベント
 * eventType: "reservation.created"
 */
export interface ReservationCreatedEvent extends DomainEvent {
  readonly eventType: 'reservation.created';
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly lineUserId: string | null;
  readonly ownerLineUserId: string | null;
  readonly slotId: string;
  readonly dateTime: string; // ISO 8601 JST
  readonly durationMinutes: number;
  readonly timestamp: string; // ISO 8601 UTC
}

/**
 * ReservationModified - 予約変更イベント
 * eventType: "reservation.modified"
 */
export interface ReservationModifiedEvent extends DomainEvent {
  readonly eventType: 'reservation.modified';
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly lineUserId: string | null;
  readonly ownerLineUserId: string | null;
  readonly slotId: string;
  readonly dateTime: string; // 変更後 ISO 8601 JST
  readonly previousDateTime: string; // 変更前 ISO 8601 JST
  readonly durationMinutes: number;
  readonly modifiedBy: 'customer' | 'owner';
  readonly timestamp: string; // ISO 8601 UTC
}

/**
 * ReservationCancelled - 予約キャンセルイベント
 * eventType: "reservation.cancelled"
 */
export interface ReservationCancelledEvent extends DomainEvent {
  readonly eventType: 'reservation.cancelled';
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerId: string;
  readonly customerName: string;
  readonly lineUserId: string | null;
  readonly ownerLineUserId: string | null;
  readonly slotId: string;
  readonly dateTime: string; // ISO 8601 JST
  readonly cancelledBy: 'customer' | 'owner';
  readonly timestamp: string; // ISO 8601 UTC
}

/** Unit 4 が発行する全イベントの判別共用型 */
export type ReservationDomainEvent =
  | ReservationCreatedEvent
  | ReservationModifiedEvent
  | ReservationCancelledEvent;
