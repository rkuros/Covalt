import { describe, it, expect } from 'vitest';
import { Duration } from '../src/Duration';

describe('Duration', () => {
  // 正常系
  it('60 分で生成できること', () => {
    const duration = Duration.create(60);
    expect(duration.minutes).toBe(60);
  });

  // 境界値
  it('最小値 15 分で生成できること', () => {
    const duration = Duration.create(15);
    expect(duration.minutes).toBe(15);
  });

  it('最大値 1440 分で生成できること', () => {
    const duration = Duration.create(1440);
    expect(duration.minutes).toBe(1440);
  });

  // 異常系
  it('14 分（最小値未満）で生成するとバリデーションエラーになること', () => {
    expect(() => Duration.create(14)).toThrow();
  });

  it('1441 分（最大値超過）で生成するとバリデーションエラーになること', () => {
    expect(() => Duration.create(1441)).toThrow();
  });

  it('0 分で生成するとバリデーションエラーになること', () => {
    expect(() => Duration.create(0)).toThrow();
  });

  it('負の値（-30）で生成するとバリデーションエラーになること', () => {
    expect(() => Duration.create(-30)).toThrow();
  });

  // 小数値の検証（整数制約）
  it('小数値（30.5）で生成するとバリデーションエラーになること', () => {
    expect(() => Duration.create(30.5)).toThrow();
  });

  // 等価性
  it('同一の minutes 値は等価であること', () => {
    const a = Duration.create(60);
    const b = Duration.create(60);
    expect(a.equals(b)).toBe(true);
  });

  it('異なる minutes 値は等価でないこと', () => {
    const a = Duration.create(60);
    const b = Duration.create(30);
    expect(a.equals(b)).toBe(false);
  });
});
