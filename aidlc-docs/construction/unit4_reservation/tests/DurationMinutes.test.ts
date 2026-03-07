import { describe, it, expect } from 'vitest';
import { DurationMinutes } from '../src/DurationMinutes';

describe('DurationMinutes', () => {
  // --- 正常系 ---

  it('有効な値（30）で生成できること', () => {
    const dm = DurationMinutes.create(30);
    expect(dm.value).toBe(30);
  });

  it('有効な値（60）で生成できること', () => {
    const dm = DurationMinutes.create(60);
    expect(dm.value).toBe(60);
  });

  it('有効な値（90）で生成できること', () => {
    const dm = DurationMinutes.create(90);
    expect(dm.value).toBe(90);
  });

  it('同じ値を持つ2つの DurationMinutes が等価と判定されること', () => {
    const dm1 = DurationMinutes.create(60);
    const dm2 = DurationMinutes.create(60);
    expect(dm1.equals(dm2)).toBe(true);
  });

  // --- 境界値 ---

  it('最小値 15 で生成できること', () => {
    const dm = DurationMinutes.create(15);
    expect(dm.value).toBe(15);
  });

  it('最大値 1440 で生成できること', () => {
    const dm = DurationMinutes.create(1440);
    expect(dm.value).toBe(1440);
  });

  it('最小値未満（14）でエラーとなること', () => {
    expect(() => DurationMinutes.create(14)).toThrow(
      'DurationMinutes must be between 15 and 1440',
    );
  });

  it('最大値超過（1441）でエラーとなること', () => {
    expect(() => DurationMinutes.create(1441)).toThrow(
      'DurationMinutes must be between 15 and 1440',
    );
  });

  // --- 異常系 ---

  it('0 を渡した場合にエラーとなること', () => {
    expect(() => DurationMinutes.create(0)).toThrow();
  });

  it('負の値を渡した場合にエラーとなること', () => {
    expect(() => DurationMinutes.create(-10)).toThrow();
  });

  it('null を渡した場合にエラーとなること', () => {
    expect(() => DurationMinutes.create(null as unknown as number)).toThrow();
  });

  it('小数値（30.5）を渡した場合にエラーとなること', () => {
    expect(() => DurationMinutes.create(30.5)).toThrow('DurationMinutes must be an integer');
  });

  // --- toString ---

  it('toString が "60min" 形式の文字列を返すこと', () => {
    const dm = DurationMinutes.create(60);
    expect(dm.toString()).toBe('60min');
  });
});
