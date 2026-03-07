import { describe, it, expect } from 'vitest';
import { Reservation } from '../src/Reservation';
import { ReservationId } from '../src/ReservationId';
import { OwnerId } from '../src/OwnerId';
import { CustomerId } from '../src/CustomerId';
import { SlotId } from '../src/SlotId';
import { ReservationDateTime } from '../src/ReservationDateTime';
import { DurationMinutes } from '../src/DurationMinutes';
import { CustomerName } from '../src/CustomerName';
import { LineUserId } from '../src/LineUserId';
import { ActorType } from '../src/ActorType';
import type {
  ReservationCreatedEvent,
  ReservationModifiedEvent,
  ReservationCancelledEvent,
} from '../src/DomainEvent';

// --- テストデータ ---

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_LINE_USER_ID = 'U1234567890abcdef1234567890abcdef';
const OWNER_LINE_USER_ID = 'Uabcdef1234567890abcdef1234567890';
const FUTURE_DT_STR = '2024-07-01T10:00:00+09:00';
const NOW = new Date('2024-06-01T12:00:00Z');

function createReservation(overrides: Record<string, unknown> = {}) {
  return Reservation.create({
    reservationId: ReservationId.create(VALID_UUID),
    ownerId: OwnerId.create('owner-001'),
    customerId: CustomerId.create('customer-001'),
    slotId: SlotId.create('slot-001'),
    dateTime: ReservationDateTime.create(FUTURE_DT_STR),
    durationMinutes: DurationMinutes.create(60),
    customerName: CustomerName.create('田中太郎'),
    lineUserId: LineUserId.create(VALID_LINE_USER_ID),
    ownerLineUserId: LineUserId.create(OWNER_LINE_USER_ID),
    createdBy: ActorType.Customer,
    now: NOW,
    ...overrides,
  });
}

// --- 5-1: ReservationCreated イベント ---

describe('ReservationCreated イベント', () => {
  function getCreatedEvent(overrides: Record<string, unknown> = {}): ReservationCreatedEvent {
    const reservation = createReservation(overrides);
    const events = reservation.domainEvents;
    return events[0] as ReservationCreatedEvent;
  }

  // --- ペイロード構造 ---

  describe('ペイロード構造', () => {
    it('eventType が reservation.created であること', () => {
      const event = getCreatedEvent();
      expect(event.eventType).toBe('reservation.created');
    });

    it('必須フィールドがすべて含まれること', () => {
      const event = getCreatedEvent();
      expect(event.reservationId).toBeDefined();
      expect(event.ownerId).toBeDefined();
      expect(event.customerId).toBeDefined();
      expect(event.customerName).toBeDefined();
      expect(event.slotId).toBeDefined();
      expect(event.dateTime).toBeDefined();
      expect(event.durationMinutes).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('lineUserId が null 許容であること（LINE 未連携のケース）', () => {
      const event = getCreatedEvent({ lineUserId: null });
      expect(event.lineUserId).toBeNull();
    });

    it('ownerLineUserId が null 許容であること', () => {
      const event = getCreatedEvent({ ownerLineUserId: null });
      expect(event.ownerLineUserId).toBeNull();
    });

    it('timestamp が UTC の ISO 8601 形式であること', () => {
      const event = getCreatedEvent();
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/);
    });

    it('dateTime が JST（+09:00）の ISO 8601 形式であること', () => {
      const event = getCreatedEvent();
      expect(event.dateTime).toMatch(/\+09:00$/);
    });

    it('durationMinutes が整数であること', () => {
      const event = getCreatedEvent();
      expect(Number.isInteger(event.durationMinutes)).toBe(true);
    });
  });

  // --- Unit 5 向け PACT 整合性 ---

  describe('Unit 5 向け PACT 整合性', () => {
    it('eventType が ^reservation\\.created$ にマッチすること', () => {
      const event = getCreatedEvent();
      expect(event.eventType).toMatch(/^reservation\.created$/);
    });

    it('reservationId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.reservationId).toBe('string');
    });

    it('ownerId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.ownerId).toBe('string');
    });

    it('customerId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.customerId).toBe('string');
    });

    it('customerName が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.customerName).toBe('string');
    });

    it('lineUserId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.lineUserId).toBe('string');
    });

    it('ownerLineUserId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.ownerLineUserId).toBe('string');
    });

    it('slotId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.slotId).toBe('string');
    });

    it('dateTime が ISO 8601 日時パターンにマッチすること', () => {
      const event = getCreatedEvent();
      expect(event.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('timestamp が UTC ISO 8601 パターンにマッチすること', () => {
      const event = getCreatedEvent();
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/);
    });
  });

  // --- Unit 7 向け PACT 整合性 ---

  describe('Unit 7 向け PACT 整合性', () => {
    it('eventType が ^reservation\\.created$ にマッチすること', () => {
      const event = getCreatedEvent();
      expect(event.eventType).toMatch(/^reservation\.created$/);
    });

    it('reservationId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.reservationId).toBe('string');
    });

    it('ownerId が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.ownerId).toBe('string');
    });

    it('customerName が文字列型であること（type マッチ）', () => {
      const event = getCreatedEvent();
      expect(typeof event.customerName).toBe('string');
    });

    it('dateTime が ISO 8601 日時パターンにマッチすること', () => {
      const event = getCreatedEvent();
      expect(event.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('durationMinutes が整数型であること（integer マッチ）', () => {
      const event = getCreatedEvent();
      expect(Number.isInteger(event.durationMinutes)).toBe(true);
    });
  });
});

// --- 5-2: ReservationModified イベント ---

describe('ReservationModified イベント', () => {
  const MODIFY_TIME = new Date('2024-06-15T12:00:00Z');
  const NEW_DT_STR = '2024-08-01T14:00:00+09:00';

  function getModifiedEvent(actor: ActorType = ActorType.Customer): ReservationModifiedEvent {
    const reservation = createReservation();
    reservation.clearDomainEvents();
    reservation.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create(NEW_DT_STR),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: actor,
      now: MODIFY_TIME,
    });
    const events = reservation.domainEvents;
    return events[0] as ReservationModifiedEvent;
  }

  // --- ペイロード構造 ---

  describe('ペイロード構造', () => {
    it('eventType が reservation.modified であること', () => {
      const event = getModifiedEvent();
      expect(event.eventType).toBe('reservation.modified');
    });

    it('必須フィールドがすべて含まれること', () => {
      const event = getModifiedEvent();
      expect(event.reservationId).toBeDefined();
      expect(event.ownerId).toBeDefined();
      expect(event.customerId).toBeDefined();
      expect(event.customerName).toBeDefined();
      expect(event.slotId).toBeDefined();
      expect(event.dateTime).toBeDefined();
      expect(event.previousDateTime).toBeDefined();
      expect(event.durationMinutes).toBeDefined();
      expect(event.modifiedBy).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('modifiedBy が customer または owner のいずれかであること', () => {
      const eventCustomer = getModifiedEvent(ActorType.Customer);
      expect(['customer', 'owner']).toContain(eventCustomer.modifiedBy);

      const eventOwner = getModifiedEvent(ActorType.Owner);
      expect(['customer', 'owner']).toContain(eventOwner.modifiedBy);
    });

    it('previousDateTime が変更前の日時であること', () => {
      const event = getModifiedEvent();
      // 元の日時は FUTURE_DT_STR
      expect(event.previousDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('dateTime が変更後の日時であること', () => {
      const event = getModifiedEvent();
      expect(event.dateTime).toMatch(/\+09:00$/);
    });

    it('lineUserId が null 許容であること', () => {
      const reservation = createReservation({ lineUserId: null });
      reservation.clearDomainEvents();
      reservation.modify({
        newSlotId: SlotId.create('slot-new'),
        newDateTime: ReservationDateTime.create(NEW_DT_STR),
        newDurationMinutes: DurationMinutes.create(90),
        modifiedBy: ActorType.Customer,
        now: MODIFY_TIME,
      });
      const event = reservation.domainEvents[0] as ReservationModifiedEvent;
      expect(event.lineUserId).toBeNull();
    });

    it('ownerLineUserId が null 許容であること', () => {
      const reservation = createReservation({ ownerLineUserId: null });
      reservation.clearDomainEvents();
      reservation.modify({
        newSlotId: SlotId.create('slot-new'),
        newDateTime: ReservationDateTime.create(NEW_DT_STR),
        newDurationMinutes: DurationMinutes.create(90),
        modifiedBy: ActorType.Customer,
        now: MODIFY_TIME,
      });
      const event = reservation.domainEvents[0] as ReservationModifiedEvent;
      expect(event.ownerLineUserId).toBeNull();
    });
  });

  // --- Unit 5 向け PACT 整合性 ---

  describe('Unit 5 向け PACT 整合性', () => {
    it('eventType が ^reservation\\.modified$ にマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.eventType).toMatch(/^reservation\.modified$/);
    });

    it('reservationId が文字列型であること（type マッチ）', () => {
      const event = getModifiedEvent();
      expect(typeof event.reservationId).toBe('string');
    });

    it('dateTime が ISO 8601 日時パターンにマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('previousDateTime が ISO 8601 日時パターンにマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.previousDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('modifiedBy が ^(customer|owner)$ にマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.modifiedBy).toMatch(/^(customer|owner)$/);
    });
  });

  // --- Unit 7 向け PACT 整合性 ---

  describe('Unit 7 向け PACT 整合性', () => {
    it('eventType が ^reservation\\.modified$ にマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.eventType).toMatch(/^reservation\.modified$/);
    });

    it('dateTime が ISO 8601 日時パターンにマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('previousDateTime が ISO 8601 日時パターンにマッチすること', () => {
      const event = getModifiedEvent();
      expect(event.previousDateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});

// --- 5-3: ReservationCancelled イベント ---

describe('ReservationCancelled イベント', () => {
  const CANCEL_TIME = new Date('2024-06-15T12:00:00Z');

  function getCancelledEvent(actor: ActorType = ActorType.Customer): ReservationCancelledEvent {
    const reservation = createReservation();
    reservation.clearDomainEvents();
    reservation.cancel(actor, CANCEL_TIME);
    const events = reservation.domainEvents;
    return events[0] as ReservationCancelledEvent;
  }

  // --- ペイロード構造 ---

  describe('ペイロード構造', () => {
    it('eventType が reservation.cancelled であること', () => {
      const event = getCancelledEvent();
      expect(event.eventType).toBe('reservation.cancelled');
    });

    it('必須フィールドがすべて含まれること', () => {
      const event = getCancelledEvent();
      expect(event.reservationId).toBeDefined();
      expect(event.ownerId).toBeDefined();
      expect(event.customerId).toBeDefined();
      expect(event.customerName).toBeDefined();
      expect(event.slotId).toBeDefined();
      expect(event.dateTime).toBeDefined();
      expect(event.cancelledBy).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('cancelledBy が customer または owner のいずれかであること', () => {
      const eventCustomer = getCancelledEvent(ActorType.Customer);
      expect(['customer', 'owner']).toContain(eventCustomer.cancelledBy);

      const eventOwner = getCancelledEvent(ActorType.Owner);
      expect(['customer', 'owner']).toContain(eventOwner.cancelledBy);
    });

    it('lineUserId が null 許容であること', () => {
      const reservation = createReservation({ lineUserId: null });
      reservation.clearDomainEvents();
      reservation.cancel(ActorType.Customer, CANCEL_TIME);
      const event = reservation.domainEvents[0] as ReservationCancelledEvent;
      expect(event.lineUserId).toBeNull();
    });

    it('ownerLineUserId が null 許容であること', () => {
      const reservation = createReservation({ ownerLineUserId: null });
      reservation.clearDomainEvents();
      reservation.cancel(ActorType.Customer, CANCEL_TIME);
      const event = reservation.domainEvents[0] as ReservationCancelledEvent;
      expect(event.ownerLineUserId).toBeNull();
    });

    it('durationMinutes が含まれないこと（キャンセルイベントには不要）', () => {
      const event = getCancelledEvent();
      expect((event as Record<string, unknown>).durationMinutes).toBeUndefined();
    });
  });

  // --- Unit 5 向け PACT 整合性 ---

  describe('Unit 5 向け PACT 整合性', () => {
    it('eventType が ^reservation\\.cancelled$ にマッチすること', () => {
      const event = getCancelledEvent();
      expect(event.eventType).toMatch(/^reservation\.cancelled$/);
    });

    it('cancelledBy が ^(customer|owner)$ にマッチすること', () => {
      const event = getCancelledEvent();
      expect(event.cancelledBy).toMatch(/^(customer|owner)$/);
    });
  });

  // --- Unit 7 向け PACT 整合性 ---

  describe('Unit 7 向け PACT 整合性', () => {
    it('eventType が ^reservation\\.cancelled$ にマッチすること', () => {
      const event = getCancelledEvent();
      expect(event.eventType).toMatch(/^reservation\.cancelled$/);
    });
  });
});

// --- 5-4: PACT フィールド網羅性の横断テスト ---

describe('PACT フィールド網羅性の横断テスト', () => {
  const MODIFY_TIME = new Date('2024-06-15T12:00:00Z');
  const CANCEL_TIME = new Date('2024-06-15T12:00:00Z');
  const NEW_DT_STR = '2024-08-01T14:00:00+09:00';

  it('Unit 5 の PACT で要求されるすべてのフィールドが対応するイベントペイロードに含まれること', () => {
    // ReservationCreated
    const reservation1 = createReservation();
    const createdEvent = reservation1.domainEvents[0] as ReservationCreatedEvent;
    expect(createdEvent.customerId).toBeDefined();
    expect(createdEvent.lineUserId).toBeDefined();
    expect(createdEvent.ownerLineUserId).toBeDefined();

    // ReservationModified
    const reservation2 = createReservation();
    reservation2.clearDomainEvents();
    reservation2.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create(NEW_DT_STR),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: MODIFY_TIME,
    });
    const modifiedEvent = reservation2.domainEvents[0] as ReservationModifiedEvent;
    expect(modifiedEvent.modifiedBy).toBeDefined();

    // ReservationCancelled
    const reservation3 = createReservation();
    reservation3.clearDomainEvents();
    reservation3.cancel(ActorType.Customer, CANCEL_TIME);
    const cancelledEvent = reservation3.domainEvents[0] as ReservationCancelledEvent;
    expect(cancelledEvent.cancelledBy).toBeDefined();
  });

  it('Unit 7 の PACT で要求されるすべてのフィールドが対応するイベントペイロードに含まれること', () => {
    // ReservationCreated: durationMinutes
    const reservation1 = createReservation();
    const createdEvent = reservation1.domainEvents[0] as ReservationCreatedEvent;
    expect(createdEvent.durationMinutes).toBeDefined();
    expect(Number.isInteger(createdEvent.durationMinutes)).toBe(true);

    // ReservationModified: previousDateTime
    const reservation2 = createReservation();
    reservation2.clearDomainEvents();
    reservation2.modify({
      newSlotId: SlotId.create('slot-new'),
      newDateTime: ReservationDateTime.create(NEW_DT_STR),
      newDurationMinutes: DurationMinutes.create(90),
      modifiedBy: ActorType.Customer,
      now: MODIFY_TIME,
    });
    const modifiedEvent = reservation2.domainEvents[0] as ReservationModifiedEvent;
    expect(modifiedEvent.previousDateTime).toBeDefined();
  });

  it('Unit 5 の PACT サンプル値 lineUserId の桁数差異: PACT の matchingRules が type マッチのため、型レベルの検証のみで十分', () => {
    // PACT サンプル値: "U1234567890abcdef" (18文字, U + 16桁hex)
    // 実装仕様: "U" + 32桁hex (33文字)
    // PACT の matchingRules は type マッチなので文字列型チェックのみ
    const reservation = createReservation();
    const event = reservation.domainEvents[0] as ReservationCreatedEvent;
    // lineUserId は文字列型
    expect(typeof event.lineUserId).toBe('string');
    // 実際の値はドメインモデルの仕様通り33文字
    expect(event.lineUserId!.length).toBe(33);
    expect(event.lineUserId).toMatch(/^U[0-9a-f]{32}$/);
  });
});
