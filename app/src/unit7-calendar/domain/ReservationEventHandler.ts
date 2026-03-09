import { CalendarSyncService } from './CalendarSyncService';
import {
  ReservationEvent,
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from './ReservationEvent';

/**
 * サービス: ReservationEventHandler
 *
 * Unit 4 からの非同期イベントを購読し、CalendarSyncService へ処理を委譲するハンドラ。
 * イベント種別に応じて適切なハンドラメソッドにディスパッチする。
 */
export class ReservationEventHandler {
  constructor(private readonly calendarSyncService: CalendarSyncService) {}

  /**
   * 予約イベントを受信して処理する。
   * イベント種別に応じて CalendarSyncService の適切なメソッドに委譲する。
   */
  async handle(event: ReservationEvent): Promise<void> {
    console.log(
      `予約イベント受信: type=${event.eventType}, reservationId=${event.reservationId}`,
    );

    try {
      switch (event.eventType) {
        case 'reservation.created':
          await this.calendarSyncService.handleReservationCreated(event);
          break;
        case 'reservation.modified':
          await this.calendarSyncService.handleReservationModified(event);
          break;
        case 'reservation.cancelled':
          await this.calendarSyncService.handleReservationCancelled(event);
          break;
        default:
          console.log(
            `未知のイベント種別: ${(event as ReservationEvent).eventType}`,
          );
      }
    } catch (error) {
      console.error(
        `予約イベント処理失敗: type=${event.eventType}, reservationId=${event.reservationId}`,
        error,
      );
      throw error;
    }
  }
}
