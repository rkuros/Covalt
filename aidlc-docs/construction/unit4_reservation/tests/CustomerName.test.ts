import { describe, it, expect } from 'vitest';
import { CustomerName } from '../src/CustomerName';

describe('CustomerName', () => {
  // --- 正常系 ---

  it('有効な文字列（例: "田中太郎"）で生成できること', () => {
    const name = CustomerName.create('田中太郎');
    expect(name.value).toBe('田中太郎');
  });

  it('同じ文字列を持つ2つの CustomerName が等価と判定されること', () => {
    const n1 = CustomerName.create('田中太郎');
    const n2 = CustomerName.create('田中太郎');
    expect(n1.equals(n2)).toBe(true);
  });

  // --- 異常系 ---

  it('null を渡した場合にエラーとなること', () => {
    expect(() => CustomerName.create(null as unknown as string)).toThrow(
      'CustomerName must not be empty',
    );
  });

  it('空文字を渡した場合にエラーとなること', () => {
    expect(() => CustomerName.create('')).toThrow('CustomerName must not be empty');
  });

  it('空白のみの文字列を渡した場合にエラーとなること', () => {
    expect(() => CustomerName.create('   ')).toThrow('CustomerName must not be empty');
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const name = CustomerName.create('佐藤花子');
    expect(name.toString()).toBe('佐藤花子');
  });
});
