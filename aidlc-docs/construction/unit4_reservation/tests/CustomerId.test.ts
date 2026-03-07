import { describe, it, expect } from 'vitest';
import { CustomerId } from '../src/CustomerId';

describe('CustomerId', () => {
  // --- 正常系 ---

  it('有効な文字列で生成できること', () => {
    const id = CustomerId.create('customer-001');
    expect(id.value).toBe('customer-001');
  });

  it('同じ文字列を持つ2つの CustomerId が等価と判定されること', () => {
    const id1 = CustomerId.create('customer-001');
    const id2 = CustomerId.create('customer-001');
    expect(id1.equals(id2)).toBe(true);
  });

  // --- 異常系 ---

  it('null を渡した場合にエラーとなること', () => {
    expect(() => CustomerId.create(null as unknown as string)).toThrow(
      'CustomerId must not be empty',
    );
  });

  it('空文字を渡した場合にエラーとなること', () => {
    expect(() => CustomerId.create('')).toThrow('CustomerId must not be empty');
  });

  it('空白のみの文字列を渡した場合にエラーとなること', () => {
    expect(() => CustomerId.create('   ')).toThrow('CustomerId must not be empty');
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const id = CustomerId.create('customer-001');
    expect(id.toString()).toBe('customer-001');
  });
});
