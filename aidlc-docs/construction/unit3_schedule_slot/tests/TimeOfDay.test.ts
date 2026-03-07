import { describe, it, expect } from 'vitest';
import { TimeOfDay } from '../src/TimeOfDay';

describe('TimeOfDay', () => {
  // 正常系
  it('hour=9, minute=0 で生成できること', () => {
    const time = TimeOfDay.create(9, 0);
    expect(time.hour).toBe(9);
    expect(time.minute).toBe(0);
  });

  it('hour=17, minute=30 で生成できること', () => {
    const time = TimeOfDay.create(17, 30);
    expect(time.hour).toBe(17);
    expect(time.minute).toBe(30);
  });

  // 境界値
  it('hour=0, minute=0 で生成できること（00:00 = 1日の最小時刻）', () => {
    const time = TimeOfDay.create(0, 0);
    expect(time.hour).toBe(0);
    expect(time.minute).toBe(0);
  });

  it('hour=23, minute=59 で生成できること（23:59 = 1日の最大時刻）', () => {
    const time = TimeOfDay.create(23, 59);
    expect(time.hour).toBe(23);
    expect(time.minute).toBe(59);
  });

  // 異常系
  it('hour=-1 で生成するとバリデーションエラーになること', () => {
    expect(() => TimeOfDay.create(-1, 0)).toThrow();
  });

  it('hour=24 で生成するとバリデーションエラーになること', () => {
    expect(() => TimeOfDay.create(24, 0)).toThrow();
  });

  it('minute=-1 で生成するとバリデーションエラーになること', () => {
    expect(() => TimeOfDay.create(9, -1)).toThrow();
  });

  it('minute=60 で生成するとバリデーションエラーになること', () => {
    expect(() => TimeOfDay.create(9, 60)).toThrow();
  });

  // 表示形式
  it('HH:mm 形式の文字列を返すこと（hour=9, minute=0 -> "09:00"）', () => {
    const time = TimeOfDay.create(9, 0);
    expect(time.toString()).toBe('09:00');
  });

  // 比較（isBefore）
  it('09:00 は 17:00 より前であること', () => {
    const t0900 = TimeOfDay.create(9, 0);
    const t1700 = TimeOfDay.create(17, 0);
    expect(t0900.isBefore(t1700)).toBe(true);
  });

  // 比較（isAfter）
  it('17:00 は 09:00 より後であること', () => {
    const t0900 = TimeOfDay.create(9, 0);
    const t1700 = TimeOfDay.create(17, 0);
    expect(t1700.isAfter(t0900)).toBe(true);
  });

  // 比較: hour 同一で minute 比較
  it('hour が同一の場合、minute で比較されること（09:00 < 09:30）', () => {
    const t0900 = TimeOfDay.create(9, 0);
    const t0930 = TimeOfDay.create(9, 30);
    expect(t0900.isBefore(t0930)).toBe(true);
    expect(t0930.isAfter(t0900)).toBe(true);
  });

  // 比較: 同一の TimeOfDay
  it('同一の TimeOfDay は isBefore=false, isAfter=false であること', () => {
    const a = TimeOfDay.create(9, 0);
    const b = TimeOfDay.create(9, 0);
    expect(a.isBefore(b)).toBe(false);
    expect(a.isAfter(b)).toBe(false);
  });

  // 等価性
  it('hour と minute がともに同一であれば等価であること', () => {
    const a = TimeOfDay.create(9, 0);
    const b = TimeOfDay.create(9, 0);
    expect(a.equals(b)).toBe(true);
  });

  it('hour または minute が異なれば等価でないこと', () => {
    const a = TimeOfDay.create(9, 0);
    const b = TimeOfDay.create(9, 30);
    const c = TimeOfDay.create(10, 0);
    expect(a.equals(b)).toBe(false);
    expect(a.equals(c)).toBe(false);
  });
});
