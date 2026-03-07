import { describe, it, expect } from 'vitest';
import { BusinessHour } from '../src/BusinessHour';
import { BusinessHourId } from '../src/BusinessHourId';
import { OwnerId } from '../src/OwnerId';
import { DayOfWeek, DayOfWeekEnum } from '../src/DayOfWeek';
import { TimeOfDay } from '../src/TimeOfDay';

describe('BusinessHour', () => {
  const defaultParams = () => ({
    businessHourId: BusinessHourId.create('bh-001'),
    ownerId: OwnerId.create('owner-001'),
    dayOfWeek: DayOfWeek.create(DayOfWeekEnum.MONDAY),
  });

  describe('生成', () => {
    it('営業日として有効な属性で生成できること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: true,
      });
      expect(bh.isBusinessDay).toBe(true);
      expect(bh.startTime?.toString()).toBe('09:00');
      expect(bh.endTime?.toString()).toBe('17:00');
    });

    it('定休日として有効な属性（isBusinessDay=false）で生成できること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: false,
      });
      expect(bh.isBusinessDay).toBe(false);
      // isBusinessDay=false の場合、startTime / endTime は null を許容する設計
      expect(bh.startTime).toBeNull();
      expect(bh.endTime).toBeNull();
    });

    it('isBusinessDay=true のとき startTime >= endTime で生成するとエラーになること', () => {
      expect(() =>
        BusinessHour.create({
          ...defaultParams(),
          startTime: TimeOfDay.create(17, 0),
          endTime: TimeOfDay.create(9, 0),
          isBusinessDay: true,
        }),
      ).toThrow();
    });

    it('isBusinessDay=true のとき startTime = endTime で生成するとエラーになること', () => {
      expect(() =>
        BusinessHour.create({
          ...defaultParams(),
          startTime: TimeOfDay.create(9, 0),
          endTime: TimeOfDay.create(9, 0),
          isBusinessDay: true,
        }),
      ).toThrow();
    });
  });

  describe('不変条件', () => {
    it('isBusinessDay=true の場合、startTime < endTime が保証されること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: true,
      });
      expect(bh.startTime!.isBefore(bh.endTime!)).toBe(true);
    });

    it('isBusinessDay=false の場合、startTime / endTime は null であること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: false,
      });
      expect(bh.startTime).toBeNull();
      expect(bh.endTime).toBeNull();
    });
  });

  describe('setBusinessHour', () => {
    it('曜日の営業時間を設定できること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: true,
      });
      bh.setBusinessHour(TimeOfDay.create(10, 0), TimeOfDay.create(18, 0));
      expect(bh.startTime?.toString()).toBe('10:00');
      expect(bh.endTime?.toString()).toBe('18:00');
      expect(bh.isBusinessDay).toBe(true);
    });

    it('isBusinessDay=true で startTime >= endTime の場合エラーになること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: true,
      });
      expect(() =>
        bh.setBusinessHour(TimeOfDay.create(17, 0), TimeOfDay.create(9, 0)),
      ).toThrow();
    });
  });

  describe('setAsClosedDay', () => {
    it('営業日を定休日に変更できること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: true,
      });
      bh.setAsClosedDay();
      expect(bh.isBusinessDay).toBe(false);
      expect(bh.startTime).toBeNull();
      expect(bh.endTime).toBeNull();
    });
  });

  describe('setAsBusinessDay', () => {
    it('定休日を営業日に戻せること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: false,
      });
      bh.setAsBusinessDay(TimeOfDay.create(10, 0), TimeOfDay.create(18, 0));
      expect(bh.isBusinessDay).toBe(true);
      expect(bh.startTime?.toString()).toBe('10:00');
      expect(bh.endTime?.toString()).toBe('18:00');
    });

    it('無効な startTime, endTime で営業日に戻そうとするとエラーになること', () => {
      const bh = BusinessHour.create({
        ...defaultParams(),
        startTime: TimeOfDay.create(9, 0),
        endTime: TimeOfDay.create(17, 0),
        isBusinessDay: false,
      });
      expect(() =>
        bh.setAsBusinessDay(TimeOfDay.create(18, 0), TimeOfDay.create(10, 0)),
      ).toThrow();
    });
  });
});
