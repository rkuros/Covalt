import { describe, it, expect } from 'vitest';
import { SlotDate } from '../src/SlotDate';

describe('SlotDate', () => {
  // 正常系
  it('有効な日付文字列 "2024-01-15" で生成できること', () => {
    const date = SlotDate.create('2024-01-15');
    expect(date.value).toBe('2024-01-15');
  });

  // 異常系
  it('null で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create(null as unknown as string)).toThrow();
  });

  it('空文字で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create('')).toThrow();
  });

  it('YYYY-MM-DD 形式でない文字列 "2024/01/15" で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create('2024/01/15')).toThrow();
  });

  it('YYYY-MM-DD 形式でない文字列 "01-15-2024" で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create('01-15-2024')).toThrow();
  });

  it('存在しない日付 "2024-02-30" で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create('2024-02-30')).toThrow();
  });

  it('存在しない日付 "2024-13-01" で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create('2024-13-01')).toThrow();
  });

  // 境界値
  it('うるう年の 2月29日 "2024-02-29" で生成できること', () => {
    const date = SlotDate.create('2024-02-29');
    expect(date.value).toBe('2024-02-29');
  });

  it('平年の 2月28日 "2025-02-28" で生成できること', () => {
    const date = SlotDate.create('2025-02-28');
    expect(date.value).toBe('2025-02-28');
  });

  it('平年の 2月29日 "2025-02-29" で生成するとバリデーションエラーになること', () => {
    expect(() => SlotDate.create('2025-02-29')).toThrow();
  });

  // 等価性
  it('同一の value を持つ SlotDate 同士は等価であること', () => {
    const a = SlotDate.create('2024-01-15');
    const b = SlotDate.create('2024-01-15');
    expect(a.equals(b)).toBe(true);
  });

  it('異なる value を持つ SlotDate 同士は等価でないこと', () => {
    const a = SlotDate.create('2024-01-15');
    const b = SlotDate.create('2024-01-16');
    expect(a.equals(b)).toBe(false);
  });
});
