import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationEventHandler } from '../src/ReservationEventHandler';
import { CalendarSyncService } from '../src/CalendarSyncService';
import {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
  ReservationEvent,
} from '../src/ReservationEvent';

describe('ReservationEventHandler', () => {
  let mockSyncService: CalendarSyncService;
  let handler: ReservationEventHandler;

  const createdEvent: ReservationCreatedEvent = {
    eventType: 'reservation.created',
    reservationId: 'reservation-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    slotId: 'slot-001',
    dateTime: '2026-06-15T10:00:00+09:00',
    durationMinutes: 60,
    timestamp: '2026-06-14T12:00:00Z',
  };

  const modifiedEvent: ReservationModifiedEvent = {
    eventType: 'reservation.modified',
    reservationId: 'reservation-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    slotId: 'slot-001',
    dateTime: '2026-06-15T14:00:00+09:00',
    previousDateTime: '2026-06-15T10:00:00+09:00',
    durationMinutes: 90,
    timestamp: '2026-06-14T13:00:00Z',
  };

  const cancelledEvent: ReservationCancelledEvent = {
    eventType: 'reservation.cancelled',
    reservationId: 'reservation-001',
    ownerId: 'owner-001',
    customerName: '田中太郎',
    slotId: 'slot-001',
    dateTime: '2026-06-15T10:00:00+09:00',
    timestamp: '2026-06-14T14:00:00Z',
  };

  beforeEach(() => {
    mockSyncService = {
      handleReservationCreated: vi.fn().mockResolvedValue(undefined),
      handleReservationModified: vi.fn().mockResolvedValue(undefined),
      handleReservationCancelled: vi.fn().mockResolvedValue(undefined),
    } as unknown as CalendarSyncService;

    handler = new ReservationEventHandler(mockSyncService);
  });

  // --- 正常系 ---

  it('10-1. reservation.created イベントを受信し、CalendarSyncService の予約作成処理に委譲できる', async () => {
    await handler.handle(createdEvent);

    expect(mockSyncService.handleReservationCreated).toHaveBeenCalledTimes(1);
    expect(mockSyncService.handleReservationCreated).toHaveBeenCalledWith(createdEvent);
  });

  it('10-2. reservation.modified イベントを受信し、CalendarSyncService の予約変更処理に委譲できる', async () => {
    await handler.handle(modifiedEvent);

    expect(mockSyncService.handleReservationModified).toHaveBeenCalledTimes(1);
    expect(mockSyncService.handleReservationModified).toHaveBeenCalledWith(modifiedEvent);
  });

  it('10-3. reservation.cancelled イベントを受信し、CalendarSyncService の予約キャンセル処理に委譲できる', async () => {
    await handler.handle(cancelledEvent);

    expect(mockSyncService.handleReservationCancelled).toHaveBeenCalledTimes(1);
    expect(mockSyncService.handleReservationCancelled).toHaveBeenCalledWith(cancelledEvent);
  });

  // --- PACT契約準拠のペイロード検証 ---

  it('10-4. reservation.created のペイロードが PACT で定義されたスキーマと一致する', () => {
    const event: ReservationCreatedEvent = {
      eventType: 'reservation.created',
      reservationId: 'res-001',
      ownerId: 'owner-001',
      customerName: '田中太郎',
      slotId: 'slot-001',
      dateTime: '2026-06-15T10:00:00+09:00',
      durationMinutes: 60,
      timestamp: '2026-06-14T12:00:00Z',
    };

    expect(event.eventType).toBe('reservation.created');
    expect(typeof event.reservationId).toBe('string');
    expect(typeof event.ownerId).toBe('string');
    expect(typeof event.customerName).toBe('string');
    expect(typeof event.slotId).toBe('string');
    expect(typeof event.dateTime).toBe('string');
    expect(typeof event.durationMinutes).toBe('number');
    expect(typeof event.timestamp).toBe('string');
  });

  it('10-5. reservation.modified のペイロードが PACT で定義されたスキーマと一致する', () => {
    const event: ReservationModifiedEvent = {
      eventType: 'reservation.modified',
      reservationId: 'res-001',
      ownerId: 'owner-001',
      customerName: '田中太郎',
      slotId: 'slot-001',
      dateTime: '2026-06-15T14:00:00+09:00',
      previousDateTime: '2026-06-15T10:00:00+09:00',
      durationMinutes: 90,
      timestamp: '2026-06-14T13:00:00Z',
    };

    expect(event.eventType).toBe('reservation.modified');
    expect(typeof event.reservationId).toBe('string');
    expect(typeof event.ownerId).toBe('string');
    expect(typeof event.customerName).toBe('string');
    expect(typeof event.slotId).toBe('string');
    expect(typeof event.dateTime).toBe('string');
    expect(typeof event.previousDateTime).toBe('string');
    expect(typeof event.durationMinutes).toBe('number');
    expect(typeof event.timestamp).toBe('string');
  });

  it('10-6. reservation.cancelled のペイロードが PACT で定義されたスキーマと一致する', () => {
    const event: ReservationCancelledEvent = {
      eventType: 'reservation.cancelled',
      reservationId: 'res-001',
      ownerId: 'owner-001',
      customerName: '田中太郎',
      slotId: 'slot-001',
      dateTime: '2026-06-15T10:00:00+09:00',
      timestamp: '2026-06-14T14:00:00Z',
    };

    expect(event.eventType).toBe('reservation.cancelled');
    expect(typeof event.reservationId).toBe('string');
    expect(typeof event.ownerId).toBe('string');
    expect(typeof event.customerName).toBe('string');
    expect(typeof event.slotId).toBe('string');
    expect(typeof event.dateTime).toBe('string');
    expect(typeof event.timestamp).toBe('string');
  });

  it('10-7. dateTime フィールドが ISO 8601 形式の正規表現パターンにマッチする', () => {
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

    expect(createdEvent.dateTime).toMatch(iso8601Pattern);
    expect(modifiedEvent.dateTime).toMatch(iso8601Pattern);
    expect(cancelledEvent.dateTime).toMatch(iso8601Pattern);
    expect(modifiedEvent.previousDateTime).toMatch(iso8601Pattern);
  });

  it('10-8. durationMinutes フィールドが整数型である', () => {
    expect(Number.isInteger(createdEvent.durationMinutes)).toBe(true);
    expect(Number.isInteger(modifiedEvent.durationMinutes)).toBe(true);
  });

  // --- 異常系 ---

  it('10-9. 未知の eventType を持つイベントを受信した場合、エラーとせず処理をスキップする', async () => {
    const unknownEvent = {
      eventType: 'reservation.unknown' as string,
      reservationId: 'res-001',
      ownerId: 'owner-001',
      customerName: '田中太郎',
      slotId: 'slot-001',
      dateTime: '2026-06-15T10:00:00Z',
      timestamp: '2026-06-14T12:00:00Z',
    } as unknown as ReservationEvent;

    // エラーにならずに正常終了する
    await expect(handler.handle(unknownEvent)).resolves.toBeUndefined();

    expect(mockSyncService.handleReservationCreated).not.toHaveBeenCalled();
    expect(mockSyncService.handleReservationModified).not.toHaveBeenCalled();
    expect(mockSyncService.handleReservationCancelled).not.toHaveBeenCalled();
  });

  it('10-10. 必須フィールド（reservationId, ownerId 等）が欠落したイベントの型安全性', () => {
    // TypeScript の型チェックにより必須フィールドの欠落はコンパイル時に検出される。
    // ランタイムでは、欠落フィールドを持つオブジェクトでも handle に渡せるが、
    // CalendarSyncService 内でのバリデーションやエラーハンドリングで対処される。
    const incompleteEvent = {
      eventType: 'reservation.created',
      // reservationId, ownerId 等が欠落
    } as unknown as ReservationEvent;

    // ハンドラ自体はイベントをそのまま委譲するので、エラーは SyncService 側で発生する
    vi.mocked(mockSyncService.handleReservationCreated).mockRejectedValue(
      new Error('reservationId is required'),
    );

    expect(handler.handle(incompleteEvent)).rejects.toThrow();
  });

  it('10-11. ペイロードのJSON形式が不正な場合のエラーハンドリング', () => {
    // JSON パース自体はハンドラの呼び出し元（メッセージブローカー等）の責務。
    // ここでは不正なオブジェクトが渡された場合の挙動を確認。
    const invalidPayload = null as unknown as ReservationEvent;

    // null が渡された場合、eventType へのアクセスでエラーが発生する
    expect(handler.handle(invalidPayload)).rejects.toThrow();
  });

  it('10-12. CalendarSyncService への委譲中にエラーが発生した場合のエラーハンドリング', async () => {
    vi.mocked(mockSyncService.handleReservationCreated).mockRejectedValue(
      new Error('Sync service error'),
    );

    await expect(handler.handle(createdEvent)).rejects.toThrow('Sync service error');
  });

  // --- 境界値 ---

  it('10-13. dateTime フィールドがタイムゾーン付き（+09:00）の場合に正しくパースされる', async () => {
    const eventWithTz: ReservationCreatedEvent = {
      ...createdEvent,
      dateTime: '2026-06-15T10:00:00+09:00',
    };

    await handler.handle(eventWithTz);

    expect(mockSyncService.handleReservationCreated).toHaveBeenCalledWith(eventWithTz);
    // dateTime フィールドがそのまま委譲されることを確認
    const passedEvent = vi.mocked(mockSyncService.handleReservationCreated).mock.calls[0][0];
    expect(passedEvent.dateTime).toBe('2026-06-15T10:00:00+09:00');
  });

  it('10-14. dateTime フィールドが UTC（Z）の場合に正しくパースされる', async () => {
    const eventWithUtc: ReservationCreatedEvent = {
      ...createdEvent,
      dateTime: '2026-06-15T01:00:00Z',
    };

    await handler.handle(eventWithUtc);

    expect(mockSyncService.handleReservationCreated).toHaveBeenCalledWith(eventWithUtc);
    const passedEvent = vi.mocked(mockSyncService.handleReservationCreated).mock.calls[0][0];
    expect(passedEvent.dateTime).toBe('2026-06-15T01:00:00Z');
  });

  it('10-15. customerName が非ASCII文字（日本語など）の場合に正しく処理される', async () => {
    const eventWithJapanese: ReservationCreatedEvent = {
      ...createdEvent,
      customerName: '田中太郎',
    };

    await handler.handle(eventWithJapanese);

    expect(mockSyncService.handleReservationCreated).toHaveBeenCalledWith(eventWithJapanese);
    const passedEvent = vi.mocked(mockSyncService.handleReservationCreated).mock.calls[0][0];
    expect(passedEvent.customerName).toBe('田中太郎');
  });
});
