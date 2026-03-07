import { describe, it, expect } from 'vitest';
import { DayOfWeek, DayOfWeekEnum } from '../src/DayOfWeek';

describe('DayOfWeek', () => {
  // 正常系: 7つの曜日値で生成できること
  const allDays: DayOfWeekEnum[] = [
    DayOfWeekEnum.MONDAY,
    DayOfWeekEnum.TUESDAY,
    DayOfWeekEnum.WEDNESDAY,
    DayOfWeekEnum.THURSDAY,
    DayOfWeekEnum.FRIDAY,
    DayOfWeekEnum.SATURDAY,
    DayOfWeekEnum.SUNDAY,
  ];

  it.each(allDays)('%s で生成できること', (day) => {
    const dow = DayOfWeek.create(day);
    expect(dow.value).toBe(day);
  });

  // 異常系
  it('上記以外の値で生成するとバリデーションエラーになること', () => {
    expect(() => DayOfWeek.create('HOLIDAY' as DayOfWeekEnum)).toThrow();
  });

  // 等価性
  it('同一の曜日値は等価であること', () => {
    const a = DayOfWeek.create(DayOfWeekEnum.MONDAY);
    const b = DayOfWeek.create(DayOfWeekEnum.MONDAY);
    expect(a.equals(b)).toBe(true);
  });

  it('異なる曜日値は等価でないこと', () => {
    const a = DayOfWeek.create(DayOfWeekEnum.MONDAY);
    const b = DayOfWeek.create(DayOfWeekEnum.FRIDAY);
    expect(a.equals(b)).toBe(false);
  });
});
