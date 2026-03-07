import { describe, it, expect, beforeEach } from 'vitest';
import { SlotAvailabilityService } from '../src/SlotAvailabilityService';
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

describe('SlotAvailabilityService', () => {
  let businessHourRepo: InMemoryBusinessHourRepository;
  let closedDayRepo: InMemoryClosedDayRepository;
  let dailySlotListRepo: InMemoryDailySlotListRepository;
  let service: SlotAvailabilityService;

  const ownerId = OwnerId.create('owner-001');
  // 2024-01-15 は月曜日
  const mondayDate = SlotDate.create('2024-01-15');
  // 2024-01-16 は火曜日
  const tuesdayDate = SlotDate.create('2024-01-16');

  beforeEach(() => {
    businessHourRepo = new InMemoryBusinessHourRepository();
    closedDayRepo = new InMemoryClosedDayRepository();
    dailySlotListRepo = new InMemoryDailySlotListRepository();
    service = new SlotAvailabilityService(
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

  describe('正常系（PACT インタラクション 1 対応）', () => {
    it('通常営業日に available 状態のスロットのみが返されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 9, 0, 17, 0);

      const availableSlot = createAvailableSlot('slot-001', 9, 0, 10, 0);
      const bookedSlot = createBookedSlot('slot-002', 10, 0, 11, 0, 'rsv-001');
      const dsl = DailySlotList.create({
        ownerId,
        date: mondayDate,
        slots: [availableSlot, bookedSlot],
      });
      await dailySlotListRepo.save(dsl);

      const result = await service.getAvailability(ownerId, mondayDate);
      expect(result.isHoliday).toBe(false);
      expect(result.availableSlots).toHaveLength(1);
      expect(result.availableSlots[0].slotId.value).toBe('slot-001');
    });

    it('返却されるスロット情報に slotId, startTime, endTime, durationMinutes, status が含まれること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 9, 0, 17, 0);

      const slot = createAvailableSlot('slot-001', 9, 0, 10, 0);
      const dsl = DailySlotList.create({
        ownerId,
        date: mondayDate,
        slots: [slot],
      });
      await dailySlotListRepo.save(dsl);

      const result = await service.getAvailability(ownerId, mondayDate);
      const returnedSlot = result.availableSlots[0];
      expect(returnedSlot.slotId.value).toBe('slot-001');
      expect(returnedSlot.startTime.toString()).toBe('09:00');
      expect(returnedSlot.endTime.toString()).toBe('10:00');
      expect(returnedSlot.durationMinutes).toBe(60);
      expect(returnedSlot.status.toPact()).toBe('available');
    });

    it('booked 状態のスロットはフィルタされ結果に含まれないこと', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 9, 0, 17, 0);

      const bookedSlot = createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001');
      const dsl = DailySlotList.create({
        ownerId,
        date: mondayDate,
        slots: [bookedSlot],
      });
      await dailySlotListRepo.save(dsl);

      const result = await service.getAvailability(ownerId, mondayDate);
      expect(result.availableSlots).toHaveLength(0);
    });
  });

  describe('休業日（PACT インタラクション 2 対応）', () => {
    it('休業日（ClosedDay が存在する日）の場合、isHoliday=true と空の slots 配列が返されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.TUESDAY, 9, 0, 17, 0);

      const closedDay = ClosedDay.create({
        closedDayId: ClosedDayId.create('cd-001'),
        ownerId,
        date: tuesdayDate,
        reason: '臨時休業',
      });
      await closedDayRepo.save(closedDay);

      const result = await service.getAvailability(ownerId, tuesdayDate);
      expect(result.isHoliday).toBe(true);
      expect(result.availableSlots).toHaveLength(0);
    });
  });

  describe('定休日', () => {
    it('定休日（isBusinessDay=false）の場合、空の slots 配列が返されること', async () => {
      const bh = BusinessHour.create({
        businessHourId: BusinessHourId.create('bh-closed'),
        ownerId,
        dayOfWeek: DayOfWeek.create(DayOfWeekEnum.MONDAY),
        startTime: TimeOfDay.create(0, 0),
        endTime: TimeOfDay.create(1, 0),
        isBusinessDay: false,
      });
      await businessHourRepo.save(bh);

      const result = await service.getAvailability(ownerId, mondayDate);
      expect(result.isHoliday).toBe(false);
      expect(result.availableSlots).toHaveLength(0);
    });
  });

  describe('境界値', () => {
    it('DailySlotList が存在しない（スロット未生成）場合、空の slots 配列が返されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 9, 0, 17, 0);

      const result = await service.getAvailability(ownerId, mondayDate);
      expect(result.availableSlots).toHaveLength(0);
    });

    it('すべてのスロットが booked の場合、空の slots 配列が返されること', async () => {
      await setupBusinessDay(DayOfWeekEnum.MONDAY, 9, 0, 17, 0);

      const dsl = DailySlotList.create({
        ownerId,
        date: mondayDate,
        slots: [
          createBookedSlot('slot-001', 9, 0, 10, 0, 'rsv-001'),
          createBookedSlot('slot-002', 10, 0, 11, 0, 'rsv-002'),
        ],
      });
      await dailySlotListRepo.save(dsl);

      const result = await service.getAvailability(ownerId, mondayDate);
      expect(result.availableSlots).toHaveLength(0);
    });
  });
});
