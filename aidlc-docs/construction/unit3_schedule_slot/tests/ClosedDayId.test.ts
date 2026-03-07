import { describe, it, expect } from 'vitest';
import { ClosedDayId } from '../src/ClosedDayId';

describe('ClosedDayId', () => {
  // 正常系
  it('有効な文字列で生成できること', () => {
    const id = ClosedDayId.create('cd-001');
    expect(id.value).toBe('cd-001');
  });

  // 異常系
  it('null で生成するとバリデーションエラーになること', () => {
    expect(() => ClosedDayId.create(null as unknown as string)).toThrow();
  });

  it('空文字で生成するとバリデーションエラーになること', () => {
    expect(() => ClosedDayId.create('')).toThrow();
  });

  // 等価性
  it('同一の value を持つ ClosedDayId 同士は等価であること', () => {
    const a = ClosedDayId.create('cd-001');
    const b = ClosedDayId.create('cd-001');
    expect(a.equals(b)).toBe(true);
  });

  it('異なる value を持つ ClosedDayId 同士は等価でないこと', () => {
    const a = ClosedDayId.create('cd-001');
    const b = ClosedDayId.create('cd-002');
    expect(a.equals(b)).toBe(false);
  });
});
