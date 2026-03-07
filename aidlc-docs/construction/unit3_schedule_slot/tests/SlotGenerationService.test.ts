import { describe, it, expect, beforeEach } from 'vitest';
import { SlotGenerationService } from '../src/SlotGenerationService';
import { InMemoryBusinessHourRepository } from '../src/InMemoryBusinessHourRepository';
import { InMemoryClosedDayRepository } from '../src/InMemoryClosedDayRepository';
import { InMemoryDailySlotListRepository } from '../src/InMemoryDailySlotListRepository';
import { BusinessHour } from '../src/BusinessHour';
import { BusinessHourId } from '../src/BusinessHourId';
import { ClosedDay } from '../src/ClosedDay';
import { ClosedDayId } from '../src/ClosedDayId';
import { DailySlotList } from '../src/DailySlotList';
import { Slot } from '../src/Slot';
import { SlotId } from '../src/SlotId';
import { OwnerId } from '../src/OwnerId';
import { SlotDate } from '../src/SlotDate';
import { DayOfWeek, DayOfWeekEnum } from '../src/DayOfWeek';
import { TimeOfDay } from '../src/TimeOfDay';
import { Duration } from '../src/Duration';
import { SlotStatus } from '../src/SlotStatus';
import { ReservationId } from '../src/ReservationId';

describe('SlotGenerationService', () => {
  let businessHourRepo: InMemoryBusinessHourRepository;
  let closedDayRepo: InMemoryClosedDayRepository;
  let dailySlotListRepo: InMemoryDailySlotListRepository;
  let service: SlotGenerationService;

  const ownerId = OwnerId.create('owner-001');
  // 2024-01-15 は月曜日
  const mondayDate = SlotDate.create('2024-01-15');
  // 2024-01-16 は火曜日
  const tuesdayDate = SlotDate.create('2024-01-16');

  beforeEach(() => {
    businessHourRepo = new InMemoryBusinessHourRepository();
    closedDayRepo = new InMemoryClosedDayRepository();
    dailySlotListRepo = new InMemoryDailySlotListRepository();
    service = new SlotGenerationService(
      businessHourRepo,
      closedDayRepo,
      dailySlotListRepo,
    );
  });

  /** ヘルパー: 営業日の BusinessHour を登録する */
  async function setupBusinessDay(
    dayOfWeek: DayOfWeekEnum,
    startHour: number,
    startMin: number,
    endHour: number,
    endMin: number,
  ): Promise<void> {
    const bh = BusinessHour.create({
      businessHourId: BusinessHourId.create(`bh-${dayOfWeek}`),
      ownerId,
      dayOfWeek: DayOfWeek.create(dayOfWeek),
      startTime: TimeOfDay.create(startHour, startMin),
      endTime: TimeOfDay.create(endHour, endMin),
      isBusinessDay: true,
    });
    await businessHourRepo.save(bh);
  }

  /** ヘルパー: 定休日の BusinessHour を登録する */
  async function setupClosedDayOfWeek(dayOfWeek: DayOfWeekEnum): Promise<void> {
    const bh = BusinessHour.create({
      businessHourId: BusinessHourId.create(`bh-${dayOfWeek}`),
      ownerId,
      dayOfWeek: DayOfWeek.create(dayOfWeek),
      startTime: TimeOfDay.create(0, 0),
      endTime: TimeOfDay.create(1, 0),
      isBusinessDay: false,
    });
    await businessHourRepo.save(bh);
  }

  describe('正常系', () => {
    it('営業日の営業時間 10:00-18:00、所要時間 60 分で 8 スロットが生成されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 18, 0);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      expect(added).toHaveLength(8);

      // リポジトリに保存されていることを検証
      const dsl = await dailySlotListRepo.findByOwnerIdAndDate(ownerId, mondayDate);
      expect(dsl).not.toBeNull();
      expect(dsl!.slots).toHaveLength(8);
    });

    it('既存の DailySlotList がない場合、新規に DailySlotList が作成されスロットが追加されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 18, 0);

      // 事前に DailySlotList が存在しないことを確認
      const beforeDsl = await dailySlotListRepo.findByOwnerIdAndDate(ownerId, mondayDate);
      expect(beforeDsl).toBeNull();

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      expect(added).toHaveLength(8);

      const afterDsl = await dailySlotListRepo.findByOwnerIdAndDate(ownerId, mondayDate);
      expect(afterDsl).not.toBeNull();
    });

    it('既存の予約済みスロットがある場合、それ以外の時間帯にスロットが生成されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 18, 0);

      // 11:00-12:00 が booked の既存 DailySlotList を準備
      const bookedSlot = Slot.create({
        slotId: SlotId.create('slot-booked'),
        startTime: TimeOfDay.create(11, 0),
        endTime: TimeOfDay.create(12, 0),
        durationMinutes: Duration.create(60),
        status: SlotStatus.booked(),
        reservationId: ReservationId.create('rsv-001'),
      });
      const existingDsl = DailySlotList.create({
        ownerId,
        date: mondayDate,
        slots: [bookedSlot],
      });
      await dailySlotListRepo.save(existingDsl);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      // 11:00-12:00 は既存のため生成されず、7 スロット追加
      expect(added).toHaveLength(7);

      const dsl = await dailySlotListRepo.findByOwnerIdAndDate(ownerId, mondayDate);
      // 合計 8 スロット（1 booked + 7 新規）
      expect(dsl!.slots).toHaveLength(8);

      // 既存の booked スロットが保持されていることを検証
      const booked = dsl!.findSlotById(SlotId.create('slot-booked'));
      expect(booked?.isBooked()).toBe(true);
    });
  });

  describe('定休日・休業日', () => {
    it('対象曜日が定休日（isBusinessDay=false）の場合、スロットが生成されないこと', async () => {
      await setupClosedDayOfWeek(DayOfWeekEnum.MONDAY);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      expect(added).toHaveLength(0);
    });

    it('対象日付が ClosedDay（休業日）の場合、スロットが生成されないこと', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 18, 0);

      // 臨時休業を設定
      const closedDay = ClosedDay.create({
        closedDayId: ClosedDayId.create('cd-001'),
        ownerId,
        date: mondayDate,
        reason: '臨時休業',
      });
      await closedDayRepo.save(closedDay);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      expect(added).toHaveLength(0);
    });
  });

  describe('境界値', () => {
    it('営業時間帯に収まらない端数時間にはスロットが生成されないこと', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 17, 30);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      // 10:00-17:30 で 60分スロット -> 7 スロット（17:00-17:30 は端数で生成しない）
      expect(added).toHaveLength(7);
    });

    it('所要時間 15 分（最小値）での生成が正常に動作すること', async () => {
      // 10:00-11:00 の 1 時間に 15 分刻みで 4 スロット
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 11, 0);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(15),
      );
      expect(added).toHaveLength(4);
    });

    it('営業時間帯の長さと所要時間が一致する場合、1 スロットのみ生成されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 10, 0, 11, 0);

      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      expect(added).toHaveLength(1);
    });
  });

  describe('異常系', () => {
    it('対象曜日の BusinessHour が未設定の場合、スロットを生成しないで正常終了すること', async () => {
      // BusinessHour を登録しない
      const added = await service.generate(
        ownerId,
        mondayDate,
        Duration.create(60),
      );
      expect(added).toHaveLength(0);
    });
  });
});
