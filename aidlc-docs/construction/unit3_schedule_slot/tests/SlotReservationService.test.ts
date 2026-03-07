import { describe, it, expect, beforeEach } from 'vitest';
import { SlotReservationService } from '../src/SlotReservationService';
import { InMemoryDailySlotListRepository } from '../src/InMemoryDailySlotListRepository';
import { DailySlotList } from '../src/DailySlotList';
import { Slot } from '../src/Slot';
import { SlotId } from '../src/SlotId';
import { OwnerId } from '../src/OwnerId';
import { SlotDate } from '../src/SlotDate';
import { TimeOfDay } from '../src/TimeOfDay';
import { Duration } from '../src/Duration';
import { SlotStatus } from '../src/SlotStatus';
import { ReservationId } from '../src/ReservationId';
import {
  SlotNotFoundError,
  SlotAlreadyBookedError,
  SlotNotBookedError,
  ReservationIdMismatchError,
} from '../src/DomainErrors';

describe('SlotReservationService', () => {
  let repo: InMemoryDailySlotListRepository;
  let service: SlotReservationService;

  const ownerId = OwnerId.create('owner-001');
  const date = SlotDate.create('2024-01-15');

  /** ヘルパー: available スロットを生成する */
  function createAvailableSlot(
    slotId: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
  ): Slot {
    const durationMin = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return Slot.create({
      slotId: SlotId.create(slotId),
      startTime: TimeOfDay.create(startHour, startMinute),
      endTime: TimeOfDay.create(endHour, endMinute),
      durationMinutes: Duration.create(durationMin),
      status: SlotStatus.available(),
      reservationId: null,
    });
  }

  /** ヘルパー: booked スロットを生成する */
  function createBookedSlot(
    slotId: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    reservationId: string,
  ): Slot {
    const durationMin = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    return Slot.create({
      slotId: SlotId.create(slotId),
      startTime: TimeOfDay.create(startHour, startMinute),
      endTime: TimeOfDay.create(endHour, endMinute),
      durationMinutes: Duration.create(durationMin),
      status: SlotStatus.booked(),
      reservationId: ReservationId.create(reservationId),
    });
  }

  beforeEach(() => {
    repo = new InMemoryDailySlotListRepository();
    service = new SlotReservationService(repo);
  });

  describe('reserve: 正常系（PACT インタラクション 3 対応）', () => {
    it('available 状態のスロットを予約確保できること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createAvailableSlot('slot-001', 9, 0, 10, 0)],
      });
      await repo.save(dsl);

      const result = await service.reserve(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      expect(result.slotId).toBe('slot-001');
      expect(result.status).toBe('booked');
      expect(result.reservationId).toBe('rsv-001');
    });

    it('予約確保後、DailySlotList の version がインクリメントされていること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createAvailableSlot('slot-001', 9, 0, 10, 0)],
      });
      await repo.save(dsl);
      const versionBefore = dsl.version.value;

      await service.reserve(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );

      const updated = await repo.findByOwnerIdAndDate(ownerId, date);
      expect(updated!.version.value).toBeGreaterThan(versionBefore);
    });

    it('予約確保後、DailySlotList が保存（save）されていること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createAvailableSlot('slot-001', 9, 0, 10, 0)],
      });
      await repo.save(dsl);

      await service.reserve(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );

      // リポジトリに保存されていることを検証
      const saved = await repo.findByOwnerIdAndDate(ownerId, date);
      expect(saved).not.toBeNull();
      const slot = saved!.findSlotById(SlotId.create('slot-001'));
      expect(slot?.isBooked()).toBe(true);
    });
  });

  describe('reserve: 異常系（PACT インタラクション 4 対応）', () => {
    it('booked 状態のスロットに reserve すると SlotAlreadyBookedError が返ること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001')],
      });
      await repo.save(dsl);

      await expect(
        service.reserve(
          SlotId.create('slot-001'),
          ReservationId.create('rsv-002'),
        ),
      ).rejects.toThrow(SlotAlreadyBookedError);
    });

    it('存在しない slotId で reserve するとエラーになること', async () => {
      await expect(
        service.reserve(
          SlotId.create('slot-999'),
          ReservationId.create('rsv-001'),
        ),
      ).rejects.toThrow(SlotNotFoundError);
    });
  });

  describe('release: 正常系（PACT インタラクション 5 対応）', () => {
    it('booked 状態のスロットを正しい reservationId で解放できること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001')],
      });
      await repo.save(dsl);

      const result = await service.release(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      expect(result.slotId).toBe('slot-001');
      expect(result.status).toBe('available');
    });

    it('解放後、DailySlotList の version がインクリメントされていること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001')],
      });
      await repo.save(dsl);
      const versionBefore = dsl.version.value;

      await service.release(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );

      const updated = await repo.findByOwnerIdAndDate(ownerId, date);
      expect(updated!.version.value).toBeGreaterThan(versionBefore);
    });

    it('解放後、DailySlotList が保存（save）されていること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001')],
      });
      await repo.save(dsl);

      await service.release(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );

      const saved = await repo.findByOwnerIdAndDate(ownerId, date);
      expect(saved).not.toBeNull();
      const slot = saved!.findSlotById(SlotId.create('slot-001'));
      expect(slot?.isAvailable()).toBe(true);
    });

    it('解放後のレスポンスに reservationId が含まれないこと', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001')],
      });
      await repo.save(dsl);

      const result = await service.release(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      // ReleaseResult には reservationId フィールドがない
      expect((result as Record<string, unknown>).reservationId).toBeUndefined();
    });
  });

  describe('release: 異常系', () => {
    it('reservationId が一致しない場合エラーになること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001')],
      });
      await repo.save(dsl);

      await expect(
        service.release(
          SlotId.create('slot-001'),
          ReservationId.create('rsv-999'),
        ),
      ).rejects.toThrow(ReservationIdMismatchError);
    });

    it('available 状態のスロットを release しようとするとエラーになること', async () => {
      const dsl = DailySlotList.create({
        ownerId,
        date,
        slots: [createAvailableSlot('slot-001', 9, 0, 10, 0)],
      });
      await repo.save(dsl);

      await expect(
        service.release(
          SlotId.create('slot-001'),
          ReservationId.create('rsv-001'),
        ),
      ).rejects.toThrow(SlotNotBookedError);
    });

    it('存在しない slotId で release するとエラーになること', async () => {
      await expect(
        service.release(
          SlotId.create('slot-999'),
          ReservationId.create('rsv-001'),
        ),
      ).rejects.toThrow(SlotNotFoundError);
    });
  });
});
