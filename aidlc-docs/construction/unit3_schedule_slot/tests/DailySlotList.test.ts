import { describe, it, expect, beforeEach } from 'vitest';
import { DailySlotList } from '../src/DailySlotList';
import { OwnerId } from '../src/OwnerId';
import { SlotDate } from '../src/SlotDate';
import { SlotId } from '../src/SlotId';
import { Slot } from '../src/Slot';
import { TimeOfDay } from '../src/TimeOfDay';
import { Duration } from '../src/Duration';
import { SlotStatus } from '../src/SlotStatus';
import { ReservationId } from '../src/ReservationId';
import { Version } from '../src/Version';
import {
  SlotOverlapError,
  SlotNotFoundError,
  SlotAlreadyBookedError,
  SlotNotAvailableError,
} from '../src/DomainErrors';
import { InMemoryDailySlotListRepository } from '../src/InMemoryDailySlotListRepository';
import { OptimisticLockError } from '../src/DomainErrors';

/** ヘルパー: available スロットを生成する */
function createAvailableSlot(
  slotId: string,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
): Slot {
  const start = TimeOfDay.create(startHour, startMinute);
  const end = TimeOfDay.create(endHour, endMinute);
  const durationMin = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return Slot.create({
    slotId: SlotId.create(slotId),
    startTime: start,
    endTime: end,
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
  const start = TimeOfDay.create(startHour, startMinute);
  const end = TimeOfDay.create(endHour, endMinute);
  const durationMin = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  return Slot.create({
    slotId: SlotId.create(slotId),
    startTime: start,
    endTime: end,
    durationMinutes: Duration.create(durationMin),
    status: SlotStatus.booked(),
    reservationId: ReservationId.create(reservationId),
  });
}

describe('DailySlotList', () => {
  const ownerId = OwnerId.create('owner-001');
  const date = SlotDate.create('2024-01-15');

  describe('属性', () => {
    it('ownerId, date, version=0, slots=空リスト で生成できること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      expect(dsl.ownerId.equals(ownerId)).toBe(true);
      expect(dsl.date.equals(date)).toBe(true);
      expect(dsl.version.value).toBe(0);
      expect(dsl.slots).toHaveLength(0);
    });
  });

  describe('addSlot', () => {
    it('空の DailySlotList にスロットを追加できること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      const slot = createAvailableSlot('slot-001', 9, 0, 10, 0);
      dsl.addSlot(slot);
      expect(dsl.slots).toHaveLength(1);
    });

    it('既存スロットと時間帯が重複しないスロットを追加できること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      dsl.addSlot(createAvailableSlot('slot-002', 11, 0, 12, 0));
      expect(dsl.slots).toHaveLength(2);
    });

    it('既存スロットと時間帯が重複するスロットを追加するとエラーになること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      expect(() =>
        dsl.addSlot(createAvailableSlot('slot-002', 9, 30, 10, 30)),
      ).toThrow(SlotOverlapError);
    });

    it('既存スロット 09:00-10:00 の直後 10:00-11:00 を追加できること（隣接は重複ではない）', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      dsl.addSlot(createAvailableSlot('slot-002', 10, 0, 11, 0));
      expect(dsl.slots).toHaveLength(2);
    });
  });

  describe('removeSlot', () => {
    it('available 状態のスロットを削除できること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      dsl.removeSlot(SlotId.create('slot-001'));
      expect(dsl.slots).toHaveLength(0);
    });

    it('booked 状態のスロットを削除しようとするとエラーになること', () => {
      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      expect(() => dsl.removeSlot(SlotId.create('slot-001'))).toThrow(
        SlotNotAvailableError,
      );
    });

    it('存在しない slotId を指定するとエラーになること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      expect(() => dsl.removeSlot(SlotId.create('slot-999'))).toThrow(
        SlotNotFoundError,
      );
    });
  });

  describe('editSlot', () => {
    it('available 状態のスロットの時間帯を変更できること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      dsl.editSlot(
        SlotId.create('slot-001'),
        TimeOfDay.create(10, 0),
        TimeOfDay.create(11, 0),
      );
      const edited = dsl.findSlotById(SlotId.create('slot-001'));
      expect(edited?.startTime.toString()).toBe('10:00');
      expect(edited?.endTime.toString()).toBe('11:00');
    });

    it('booked 状態のスロットを編集しようとするとエラーになること', () => {
      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      expect(() =>
        dsl.editSlot(
          SlotId.create('slot-001'),
          TimeOfDay.create(10, 0),
          TimeOfDay.create(11, 0),
        ),
      ).toThrow(SlotNotAvailableError);
    });

    it('変更後の時間帯が他のスロットと重複する場合エラーになること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      dsl.addSlot(createAvailableSlot('slot-002', 11, 0, 12, 0));
      // slot-001 を 11:00-12:00 に変更しようとすると slot-002 と重複
      expect(() =>
        dsl.editSlot(
          SlotId.create('slot-001'),
          TimeOfDay.create(11, 0),
          TimeOfDay.create(12, 0),
        ),
      ).toThrow(SlotOverlapError);
    });
  });

  describe('reserveSlot', () => {
    it('available 状態のスロットを予約確保できること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      dsl.reserveSlot(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      const slot = dsl.findSlotById(SlotId.create('slot-001'));
      expect(slot?.isBooked()).toBe(true);
      expect(slot?.reservationId?.value).toBe('rsv-001');
    });

    it('予約確保後に version がインクリメントされること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      const versionBefore = dsl.version.value;
      dsl.reserveSlot(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      expect(dsl.version.value).toBe(versionBefore + 1);
    });

    it('booked 状態のスロットを予約確保しようとすると SlotAlreadyBookedError になること', () => {
      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      expect(() =>
        dsl.reserveSlot(
          SlotId.create('slot-001'),
          ReservationId.create('rsv-002'),
        ),
      ).toThrow(SlotAlreadyBookedError);
    });

    it('存在しない slotId を指定するとエラーになること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      expect(() =>
        dsl.reserveSlot(
          SlotId.create('slot-999'),
          ReservationId.create('rsv-001'),
        ),
      ).toThrow(SlotNotFoundError);
    });
  });

  describe('releaseSlot', () => {
    it('booked 状態のスロットを正しい reservationId で解放できること', () => {
      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      dsl.releaseSlot(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      const slot = dsl.findSlotById(SlotId.create('slot-001'));
      expect(slot?.isAvailable()).toBe(true);
      expect(slot?.reservationId).toBeNull();
    });

    it('解放後に version がインクリメントされること', () => {
      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      const versionBefore = dsl.version.value;
      dsl.releaseSlot(
        SlotId.create('slot-001'),
        ReservationId.create('rsv-001'),
      );
      expect(dsl.version.value).toBe(versionBefore + 1);
    });

    it('reservationId が一致しない場合エラーになること', () => {
      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      expect(() =>
        dsl.releaseSlot(
          SlotId.create('slot-001'),
          ReservationId.create('rsv-999'),
        ),
      ).toThrow();
    });

    it('available 状態のスロットを解放しようとするとエラーになること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      expect(() =>
        dsl.releaseSlot(
          SlotId.create('slot-001'),
          ReservationId.create('rsv-001'),
        ),
      ).toThrow();
    });
  });

  describe('generateSlots', () => {
    it('営業時間 10:00-18:00、所要時間 60 分で 8 スロットが生成されること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      const added = dsl.generateSlots(
        TimeOfDay.create(10, 0),
        TimeOfDay.create(18, 0),
        Duration.create(60),
      );
      expect(added).toHaveLength(8);
      expect(dsl.slots).toHaveLength(8);
      // 先頭: 10:00-11:00, 末尾: 17:00-18:00
      expect(added[0].startTime.toString()).toBe('10:00');
      expect(added[0].endTime.toString()).toBe('11:00');
      expect(added[7].startTime.toString()).toBe('17:00');
      expect(added[7].endTime.toString()).toBe('18:00');
    });

    it('既存の予約済みスロットと重複しない位置にのみスロットが生成されること', () => {
      const bookedSlot = createBookedSlot('slot-booked', 11, 0, 12, 0, 'rsv-001');
      const dsl = DailySlotList.create({ ownerId, date, slots: [bookedSlot] });
      const added = dsl.generateSlots(
        TimeOfDay.create(10, 0),
        TimeOfDay.create(18, 0),
        Duration.create(60),
      );
      // 11:00-12:00 は既存のため生成されず、7 スロット
      expect(added).toHaveLength(7);
      // booked スロットは保持されている
      const allSlots = dsl.slots;
      expect(allSlots).toHaveLength(8);
      const bookedFound = allSlots.find(
        (s) => s.slotId.value === 'slot-booked',
      );
      expect(bookedFound?.isBooked()).toBe(true);
    });

    it('営業時間 10:00-17:30、所要時間 60 分の場合、端数にはスロットが生成されないこと（7 スロット）', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      const added = dsl.generateSlots(
        TimeOfDay.create(10, 0),
        TimeOfDay.create(17, 30),
        Duration.create(60),
      );
      expect(added).toHaveLength(7);
      // 最後のスロットは 16:00-17:00
      expect(added[6].startTime.toString()).toBe('16:00');
      expect(added[6].endTime.toString()).toBe('17:00');
    });

    it('営業時間帯の長さが所要時間ちょうどの場合、1 スロットが生成されること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      const added = dsl.generateSlots(
        TimeOfDay.create(10, 0),
        TimeOfDay.create(11, 0),
        Duration.create(60),
      );
      expect(added).toHaveLength(1);
    });
  });

  describe('不変条件', () => {
    it('同一 DailySlotList 内のスロットは時間帯が重複しないこと', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      expect(() =>
        dsl.addSlot(createAvailableSlot('slot-002', 9, 30, 10, 30)),
      ).toThrow(SlotOverlapError);
    });

    it('version は更新操作ごとにインクリメントされること', () => {
      const dsl = DailySlotList.create({ ownerId, date });
      expect(dsl.version.value).toBe(0);
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      expect(dsl.version.value).toBe(1);
      dsl.addSlot(createAvailableSlot('slot-002', 10, 0, 11, 0));
      expect(dsl.version.value).toBe(2);
      dsl.removeSlot(SlotId.create('slot-002'));
      expect(dsl.version.value).toBe(3);
    });
  });

  describe('楽観的ロック', () => {
    let repo: InMemoryDailySlotListRepository;

    beforeEach(() => {
      repo = new InMemoryDailySlotListRepository();
    });

    it('version が一致する場合、更新が成功すること', async () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      await repo.save(dsl);

      // 再取得して更新
      const loaded = await repo.findByOwnerIdAndDate(ownerId, date);
      loaded!.addSlot(createAvailableSlot('slot-002', 10, 0, 11, 0));
      await expect(repo.save(loaded!)).resolves.not.toThrow();
    });

    it('version が一致しない場合、楽観的ロック例外が発生すること', async () => {
      const dsl = DailySlotList.create({ ownerId, date });
      dsl.addSlot(createAvailableSlot('slot-001', 9, 0, 10, 0));
      await repo.save(dsl);

      // 同じ DailySlotList を2つのトランザクションとして取得
      const tx1 = await repo.findByOwnerIdAndDate(ownerId, date);
      const tx2 = await repo.findByOwnerIdAndDate(ownerId, date);

      // tx1 が先に更新・保存
      tx1!.addSlot(createAvailableSlot('slot-002', 10, 0, 11, 0));
      await repo.save(tx1!);

      // tx2 が後から更新・保存 -> version が合わないのでエラー
      tx2!.addSlot(createAvailableSlot('slot-003', 11, 0, 12, 0));
      await expect(repo.save(tx2!)).rejects.toThrow(OptimisticLockError);
    });
  });
});
