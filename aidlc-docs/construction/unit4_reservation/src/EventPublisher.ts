/**
 * EventPublisher - ドメインイベントを外部に発行するためのインターフェース
 *
 * Unit 5（LINE 通知）および Unit 7（Google カレンダー連携）が Consumer となる。
 * at-least-once 配信保証。Consumer 側で冪等性を担保する。
 */
import { ReservationDomainEvent } from './DomainEvent';

export interface EventPublisher {
  /** ドメインイベントを発行する。 */
  publish(event: ReservationDomainEvent): Promise<void>;
}
