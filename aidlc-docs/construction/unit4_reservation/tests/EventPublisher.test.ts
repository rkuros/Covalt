import { describe, it, expect, vi } from 'vitest';
import type { EventPublisher } from '../src/EventPublisher';
import type {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from '../src/DomainEvent';

/**
 * EventPublisher インターフェースのテスト。
 * Gateway インターフェースの実装自体はモックとし、インターフェース契約を vi.fn() で確認する。
 */
describe('EventPublisher インターフェース', () => {
  function createMockEventPublisher(): EventPublisher {
    return {
      publish: vi.fn().mockResolvedValue(undefined),
    };
  }

  const TIMESTAMP = '2024-06-01T12:00:00.000Z';

  it('publish で ReservationCreated イベントを発行できること', async () => {
    const publisher = createMockEventPublisher();
    const event: ReservationCreatedEvent = {
      eventType: 'reservation.created',
      reservationId: '550e8400-e29b-41d4-a716-446655440000',
      ownerId: 'owner-001',
      customerId: 'customer-001',
      customerName: '田中太郎',
      lineUserId: 'U1234567890abcdef1234567890abcdef',
      ownerLineUserId: null,
      slotId: 'slot-001',
      dateTime: '2024-07-01T10:00:00+09:00',
      durationMinutes: 60,
      timestamp: TIMESTAMP,
    };

    await publisher.publish(event);

    expect(publisher.publish).toHaveBeenCalledWith(event);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('publish で ReservationModified イベントを発行できること', async () => {
    const publisher = createMockEventPublisher();
    const event: ReservationModifiedEvent = {
      eventType: 'reservation.modified',
      reservationId: '550e8400-e29b-41d4-a716-446655440000',
      ownerId: 'owner-001',
      customerId: 'customer-001',
      customerName: '田中太郎',
      lineUserId: 'U1234567890abcdef1234567890abcdef',
      ownerLineUserId: null,
      slotId: 'slot-new',
      dateTime: '2024-08-01T14:00:00+09:00',
      previousDateTime: '2024-07-01T10:00:00+09:00',
      durationMinutes: 90,
      modifiedBy: 'customer',
      timestamp: TIMESTAMP,
    };

    await publisher.publish(event);

    expect(publisher.publish).toHaveBeenCalledWith(event);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('publish で ReservationCancelled イベントを発行できること', async () => {
    const publisher = createMockEventPublisher();
    const event: ReservationCancelledEvent = {
      eventType: 'reservation.cancelled',
      reservationId: '550e8400-e29b-41d4-a716-446655440000',
      ownerId: 'owner-001',
      customerId: 'customer-001',
      customerName: '田中太郎',
      lineUserId: 'U1234567890abcdef1234567890abcdef',
      ownerLineUserId: null,
      slotId: 'slot-001',
      dateTime: '2024-07-01T10:00:00+09:00',
      cancelledBy: 'customer',
      timestamp: TIMESTAMP,
    };

    await publisher.publish(event);

    expect(publisher.publish).toHaveBeenCalledWith(event);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
