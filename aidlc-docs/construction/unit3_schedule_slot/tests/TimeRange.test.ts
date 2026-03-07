import { describe, it, expect } from 'vitest';
import { TimeRange } from '../src/TimeRange';
import { TimeOfDay } from '../src/TimeOfDay';

describe('TimeRange', () => {
  // 正常系
  it('startTime=09:00, endTime=17:00 で生成できること', () => {
    const range = TimeRange.create(
      TimeOfDay.create(9, 0),
      TimeOfDay.create(17, 0),
    );
    expect(range.startTime.toString()).toBe('09:00');
    expect(range.endTime.toString()).toBe('17:00');
  });

  // 異常系
  it('startTime と endTime が同一で生成するとバリデーションエラーになること', () => {
    expect(() =>
      TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(9, 0)),
    ).toThrow();
  });

  it('startTime が endTime より後で生成するとバリデーションエラーになること', () => {
    expect(() =>
      TimeRange.create(TimeOfDay.create(17, 0), TimeOfDay.create(9, 0)),
    ).toThrow();
  });

  // overlaps
  it('09:00-12:00 と 11:00-14:00 は重複すること（部分重複）', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(12, 0));
    const b = TimeRange.create(TimeOfDay.create(11, 0), TimeOfDay.create(14, 0));
    expect(a.overlaps(b)).toBe(true);
  });

  it('09:00-12:00 と 12:00-14:00 は重複しないこと（隣接）', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(12, 0));
    const b = TimeRange.create(TimeOfDay.create(12, 0), TimeOfDay.create(14, 0));
    expect(a.overlaps(b)).toBe(false);
  });

  it('09:00-14:00 と 10:00-12:00 は重複すること（包含）', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(14, 0));
    const b = TimeRange.create(TimeOfDay.create(10, 0), TimeOfDay.create(12, 0));
    expect(a.overlaps(b)).toBe(true);
  });

  it('09:00-12:00 と 13:00-15:00 は重複しないこと（離れている）', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(12, 0));
    const b = TimeRange.create(TimeOfDay.create(13, 0), TimeOfDay.create(15, 0));
    expect(a.overlaps(b)).toBe(false);
  });

  it('09:00-12:00 と 09:00-12:00 は重複すること（完全一致）', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(12, 0));
    const b = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(12, 0));
    expect(a.overlaps(b)).toBe(true);
  });

  // contains（半開区間 [start, end)）
  it('09:00-17:00 は 12:00 を含むこと', () => {
    const range = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    expect(range.contains(TimeOfDay.create(12, 0))).toBe(true);
  });

  it('09:00-17:00 は 09:00 を含むこと（開始時刻を含む）', () => {
    const range = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    expect(range.contains(TimeOfDay.create(9, 0))).toBe(true);
  });

  it('09:00-17:00 は 17:00 を含まないこと（半開区間: endTime は含まない）', () => {
    const range = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    expect(range.contains(TimeOfDay.create(17, 0))).toBe(false);
  });

  it('09:00-17:00 は 08:59 を含まないこと', () => {
    const range = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    expect(range.contains(TimeOfDay.create(8, 59))).toBe(false);
  });

  // durationInMinutes
  it('09:00-17:00 の場合 480 分を返すこと', () => {
    const range = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    expect(range.durationInMinutes()).toBe(480);
  });

  it('10:00-10:15 の場合 15 分を返すこと', () => {
    const range = TimeRange.create(TimeOfDay.create(10, 0), TimeOfDay.create(10, 15));
    expect(range.durationInMinutes()).toBe(15);
  });

  // 等価性
  it('startTime と endTime がともに同一であれば等価であること', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    const b = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    expect(a.equals(b)).toBe(true);
  });

  it('startTime または endTime が異なれば等価でないこと', () => {
    const a = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(17, 0));
    const b = TimeRange.create(TimeOfDay.create(9, 0), TimeOfDay.create(18, 0));
    const c = TimeRange.create(TimeOfDay.create(10, 0), TimeOfDay.create(17, 0));
    expect(a.equals(b)).toBe(false);
    expect(a.equals(c)).toBe(false);
  });
});
