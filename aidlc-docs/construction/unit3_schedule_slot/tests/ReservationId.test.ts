import { describe, it, expect } from 'vitest';
import { ReservationId } from '../src/ReservationId';

describe('ReservationId', () => {
  // 正常系
  it('有効な文字列で生成できること', () => {
    const id = ReservationId.create('rsv-001');
    expect(id.value).toBe('rsv-001');
  });

  // 異常系
  it('null で生成するとバリデーションエラーになること', () => {
    expect(() => ReservationId.create(null as unknown as string)).toThrow();
  });

  it('空文字で生成するとバリデーションエラーになること', () => {
    expect(() => ReservationId.create('')).toThrow();
  });

  // 等価性
  it('同一の value を持つ ReservationId 同士は等価であること', () => {
    const a = ReservationId.create('rsv-001');
    const b = ReservationId.create('rsv-001');
    expect(a.equals(b)).toBe(true);
  });

  it('異なる value を持つ ReservationId 同士は等価でないこと', () => {
    const a = ReservationId.create('rsv-001');
    const b = ReservationId.create('rsv-002');
    expect(a.equals(b)).toBe(false);
  });
});
