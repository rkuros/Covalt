/**
 * Unit 4 から受信する予約イベントの型定義。
 * PACT 契約 unit7-unit4-reservation-events.pact.json に準拠。
 */

export interface ReservationCreatedEvent {
  readonly eventType: 'reservation.created';
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerName: string;
  readonly slotId: string;
  readonly dateTime: string; // ISO 8601
  readonly durationMinutes: number;
  readonly timestamp: string; // ISO 8601
}

export interface ReservationModifiedEvent {
  readonly eventType: 'reservation.modified';
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerName: string;
  readonly slotId: string;
  readonly dateTime: string; // ISO 8601
  readonly previousDateTime: string; // ISO 8601
  readonly durationMinutes: number;
  readonly timestamp: string; // ISO 8601
}

export interface ReservationCancelledEvent {
  readonly eventType: 'reservation.cancelled';
  readonly reservationId: string;
  readonly ownerId: string;
  readonly customerName: string;
  readonly slotId: string;
  readonly dateTime: string; // ISO 8601
  readonly timestamp: string; // ISO 8601
}

export type ReservationEvent =
  | ReservationCreatedEvent
  | ReservationModifiedEvent
  | ReservationCancelledEvent;
