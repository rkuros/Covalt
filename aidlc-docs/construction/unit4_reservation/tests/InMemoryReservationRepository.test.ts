import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryReservationRepository } from '../src/InMemoryReservationRepository';
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
import { ReservationStatus } from '../src/ReservationStatus';

// --- テストデータヘルパー ---

const VALID_LINE_USER_ID = 'U1234567890abcdef1234567890abcdef';
const NOW = new Date('2024-06-01T12:00:00Z');

let uuidCounter = 0;
function nextUUID(): string {
  uuidCounter++;
  const hex = uuidCounter.toString(16).padStart(12, '0');
  return `550e8400-e29b-41d4-a716-${hex}`;
}

function createReservation(overrides: {
  reservationId?: string;
  ownerId?: string;
  customerId?: string;
  dateTimeStr?: string;
  status?: 'confirmed' | 'cancelled' | 'completed';
  now?: Date;
} = {}): Reservation {
  const reservation = Reservation.create({
    reservationId: ReservationId.create(overrides.reservationId ?? nextUUID()),
    ownerId: OwnerId.create(overrides.ownerId ?? 'owner-001'),
    customerId: CustomerId.create(overrides.customerId ?? 'customer-001'),
    slotId: SlotId.create('slot-001'),
    dateTime: ReservationDateTime.create(overrides.dateTimeStr ?? '2025-07-01T10:00:00+09:00'),
    durationMinutes: DurationMinutes.create(60),
    customerName: CustomerName.create('田中太郎'),
    lineUserId: LineUserId.create(VALID_LINE_USER_ID),
    ownerLineUserId: null,
    createdBy: ActorType.Customer,
    now: overrides.now ?? NOW,
  });

  if (overrides.status === 'cancelled') {
    reservation.cancel(ActorType.Customer, overrides.now ?? NOW);
  } else if (overrides.status === 'completed') {
    reservation.complete(overrides.now ?? NOW);
  }

  reservation.clearDomainEvents();
  return reservation;
}

describe('InMemoryReservationRepository', () => {
  let repo: InMemoryReservationRepository;

  beforeEach(() => {
    repo = new InMemoryReservationRepository();
    uuidCounter = 0;
  });

  // --- 6-1-1: save ---

  describe('save', () => {
    it('Reservation 集約（ReservationHistory を含む）を保存できること', async () => {
      const reservation = createReservation();
      await repo.save(reservation);

      const found = await repo.findById(reservation.reservationId);
      expect(found).not.toBeNull();
    });

    it('新規作成（INSERT 相当）と更新（UPDATE 相当）の両方が動作すること', async () => {
      const reservation = createReservation();
      await repo.save(reservation);

      // 更新（modify）
      reservation.modify({
        newSlotId: SlotId.create('slot-new'),
        newDateTime: ReservationDateTime.create('2025-08-01T14:00:00+09:00'),
        newDurationMinutes: DurationMinutes.create(90),
        modifiedBy: ActorType.Customer,
        now: new Date('2024-06-15T12:00:00Z'),
      });
      await repo.save(reservation);

      const found = await repo.findById(reservation.reservationId);
      expect(found).not.toBeNull();
      expect(found!.slotId.value).toBe('slot-new');
    });

    it('ReservationHistory を含む集約全体が保存されること', async () => {
      const reservation = createReservation();
      reservation.modify({
        newSlotId: SlotId.create('slot-new'),
        newDateTime: ReservationDateTime.create('2025-08-01T14:00:00+09:00'),
        newDurationMinutes: DurationMinutes.create(90),
        modifiedBy: ActorType.Customer,
        now: new Date('2024-06-15T12:00:00Z'),
      });
      reservation.clearDomainEvents();
      await repo.save(reservation);

      const found = await repo.findById(reservation.reservationId);
      expect(found!.histories).toHaveLength(1);
    });
  });

  // --- 6-1-2: findById ---

  describe('findById', () => {
    it('存在する reservationId で Reservation 集約を取得できること', async () => {
      const reservation = createReservation();
      await repo.save(reservation);

      const found = await repo.findById(reservation.reservationId);
      expect(found).not.toBeNull();
      expect(found!.reservationId.equals(reservation.reservationId)).toBe(true);
    });

    it('存在しない reservationId の場合に null が返ること', async () => {
      const found = await repo.findById(ReservationId.create('550e8400-e29b-41d4-a716-999999999999'));
      expect(found).toBeNull();
    });

    it('取得した Reservation に紐づく ReservationHistory が正しくロードされること', async () => {
      const reservation = createReservation();
      reservation.modify({
        newSlotId: SlotId.create('slot-new'),
        newDateTime: ReservationDateTime.create('2025-08-01T14:00:00+09:00'),
        newDurationMinutes: DurationMinutes.create(90),
        modifiedBy: ActorType.Customer,
        now: new Date('2024-06-15T12:00:00Z'),
      });
      reservation.clearDomainEvents();
      await repo.save(reservation);

      const found = await repo.findById(reservation.reservationId);
      expect(found!.histories).toHaveLength(1);
      expect(found!.histories[0].changeType).toBe('modified');
    });
  });

  // --- 6-1-3: findUpcomingByCustomerId ---

  describe('findUpcomingByCustomerId', () => {
    it('指定した customerId / ownerId に該当する未来の confirmed 予約が返ること', async () => {
      const reservation = createReservation({
        dateTimeStr: '2099-07-01T10:00:00+09:00',
      });
      await repo.save(reservation);

      const results = await repo.findUpcomingByCustomerId(
        CustomerId.create('customer-001'),
        OwnerId.create('owner-001'),
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].status).toBe(ReservationStatus.Confirmed);
    });

    it('過去日時の予約が含まれないこと', async () => {
      const pastReservation = createReservation({
        dateTimeStr: '2020-01-01T10:00:00+09:00',
      });
      await repo.save(pastReservation);

      const futureReservation = createReservation({
        dateTimeStr: '2099-12-01T10:00:00+09:00',
      });
      await repo.save(futureReservation);

      const results = await repo.findUpcomingByCustomerId(
        CustomerId.create('customer-001'),
        OwnerId.create('owner-001'),
      );

      // 過去のものは含まれない
      const pastIds = results.filter(
        (r) => r.reservationId.equals(pastReservation.reservationId),
      );
      expect(pastIds).toHaveLength(0);
    });

    it('cancelled / completed ステータスの予約が含まれないこと', async () => {
      const cancelledReservation = createReservation({
        dateTimeStr: '2099-07-01T10:00:00+09:00',
        status: 'cancelled',
      });
      await repo.save(cancelledReservation);

      const results = await repo.findUpcomingByCustomerId(
        CustomerId.create('customer-001'),
        OwnerId.create('owner-001'),
      );

      const cancelledIds = results.filter(
        (r) => r.reservationId.equals(cancelledReservation.reservationId),
      );
      expect(cancelledIds).toHaveLength(0);
    });

    it('該当する予約がない場合に空リストが返ること', async () => {
      const results = await repo.findUpcomingByCustomerId(
        CustomerId.create('no-such-customer'),
        OwnerId.create('owner-001'),
      );
      expect(results).toHaveLength(0);
    });
  });

  // --- 6-1-4: findPastByCustomerId ---

  describe('findPastByCustomerId', () => {
    it('指定した customerId / ownerId に該当する過去の予約が返ること', async () => {
      const pastReservation = createReservation({
        dateTimeStr: '2020-01-01T10:00:00+09:00',
      });
      await repo.save(pastReservation);

      const results = await repo.findPastByCustomerId(
        CustomerId.create('customer-001'),
        OwnerId.create('owner-001'),
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('直近順（dateTime 降順）にソートされていること', async () => {
      const r1 = createReservation({
        dateTimeStr: '2020-01-01T10:00:00+09:00',
      });
      const r2 = createReservation({
        dateTimeStr: '2020-06-01T10:00:00+09:00',
      });
      await repo.save(r1);
      await repo.save(r2);

      const results = await repo.findPastByCustomerId(
        CustomerId.create('customer-001'),
        OwnerId.create('owner-001'),
      );

      if (results.length >= 2) {
        // 降順: r2 が先
        expect(results[0].dateTime.value.getTime()).toBeGreaterThanOrEqual(
          results[1].dateTime.value.getTime(),
        );
      }
    });

    it('該当する予約がない場合に空リストが返ること', async () => {
      const results = await repo.findPastByCustomerId(
        CustomerId.create('no-such-customer'),
        OwnerId.create('owner-001'),
      );
      expect(results).toHaveLength(0);
    });
  });

  // --- 6-1-5: findByOwnerIdAndDateRange ---

  describe('findByOwnerIdAndDateRange', () => {
    it('指定した ownerId と日付範囲に該当する予約が返ること', async () => {
      const reservation = createReservation({
        dateTimeStr: '2025-07-15T10:00:00+09:00',
      });
      await repo.save(reservation);

      const results = await repo.findByOwnerIdAndDateRange(
        OwnerId.create('owner-001'),
        new Date('2025-07-01T00:00:00Z'),
        new Date('2025-07-31T23:59:59Z'),
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('日付範囲外の予約が含まれないこと', async () => {
      const outOfRange = createReservation({
        dateTimeStr: '2025-08-15T10:00:00+09:00',
      });
      await repo.save(outOfRange);

      const results = await repo.findByOwnerIdAndDateRange(
        OwnerId.create('owner-001'),
        new Date('2025-07-01T00:00:00Z'),
        new Date('2025-07-31T23:59:59Z'),
      );

      const found = results.filter(
        (r) => r.reservationId.equals(outOfRange.reservationId),
      );
      expect(found).toHaveLength(0);
    });

    it('startDate と endDate が同一日の場合に、その日の予約が返ること', async () => {
      const reservation = createReservation({
        dateTimeStr: '2025-07-15T10:00:00+09:00',
      });
      await repo.save(reservation);

      // 同一日（UTC ベースで 2025-07-15T01:00:00Z が JSTの10:00）
      const results = await repo.findByOwnerIdAndDateRange(
        OwnerId.create('owner-001'),
        new Date('2025-07-14T15:00:00Z'), // JST 2025-07-15 00:00
        new Date('2025-07-15T14:59:59Z'), // JST 2025-07-15 23:59
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('該当する予約がない場合に空リストが返ること', async () => {
      const results = await repo.findByOwnerIdAndDateRange(
        OwnerId.create('owner-001'),
        new Date('2099-01-01T00:00:00Z'),
        new Date('2099-01-31T23:59:59Z'),
      );
      expect(results).toHaveLength(0);
    });
  });

  // --- 6-1-6: findByOwnerIdAndStatus ---

  describe('findByOwnerIdAndStatus', () => {
    it('指定した ownerId とステータスに該当する予約が返ること', async () => {
      const reservation = createReservation();
      await repo.save(reservation);

      const results = await repo.findByOwnerIdAndStatus(
        OwnerId.create('owner-001'),
        ReservationStatus.Confirmed,
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('異なるステータスの予約が含まれないこと', async () => {
      const cancelledReservation = createReservation({
        dateTimeStr: '2099-07-01T10:00:00+09:00',
        status: 'cancelled',
      });
      await repo.save(cancelledReservation);

      const results = await repo.findByOwnerIdAndStatus(
        OwnerId.create('owner-001'),
        ReservationStatus.Confirmed,
      );

      const found = results.filter(
        (r) => r.reservationId.equals(cancelledReservation.reservationId),
      );
      expect(found).toHaveLength(0);
    });

    it('該当する予約がない場合に空リストが返ること', async () => {
      const results = await repo.findByOwnerIdAndStatus(
        OwnerId.create('no-such-owner'),
        ReservationStatus.Confirmed,
      );
      expect(results).toHaveLength(0);
    });
  });

  // --- 6-1-7: findByOwnerIdAndDateRangeAndStatus ---

  describe('findByOwnerIdAndDateRangeAndStatus', () => {
    it('ownerId、日付範囲、ステータスの複合条件に該当する予約が返ること', async () => {
      const reservation = createReservation({
        dateTimeStr: '2025-07-15T10:00:00+09:00',
      });
      await repo.save(reservation);

      const results = await repo.findByOwnerIdAndDateRangeAndStatus(
        OwnerId.create('owner-001'),
        new Date('2025-07-01T00:00:00Z'),
        new Date('2025-07-31T23:59:59Z'),
        ReservationStatus.Confirmed,
      );
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('いずれかの条件に合致しない予約が含まれないこと', async () => {
      // 日付範囲内だがステータスが cancelled
      const cancelledReservation = createReservation({
        dateTimeStr: '2025-07-15T10:00:00+09:00',
        status: 'cancelled',
      });
      await repo.save(cancelledReservation);

      const results = await repo.findByOwnerIdAndDateRangeAndStatus(
        OwnerId.create('owner-001'),
        new Date('2025-07-01T00:00:00Z'),
        new Date('2025-07-31T23:59:59Z'),
        ReservationStatus.Confirmed,
      );

      const found = results.filter(
        (r) => r.reservationId.equals(cancelledReservation.reservationId),
      );
      expect(found).toHaveLength(0);
    });

    it('該当する予約がない場合に空リストが返ること', async () => {
      const results = await repo.findByOwnerIdAndDateRangeAndStatus(
        OwnerId.create('owner-001'),
        new Date('2099-01-01T00:00:00Z'),
        new Date('2099-01-31T23:59:59Z'),
        ReservationStatus.Confirmed,
      );
      expect(results).toHaveLength(0);
    });
  });
});
