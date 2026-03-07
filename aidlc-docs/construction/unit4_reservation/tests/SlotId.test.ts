import { describe, it, expect } from 'vitest';
import { SlotId } from '../src/SlotId';

describe('SlotId', () => {
  // --- 正常系 ---

  it('有効な文字列で生成できること', () => {
    const id = SlotId.create('slot-001');
    expect(id.value).toBe('slot-001');
  });

  it('同じ文字列を持つ2つの SlotId が等価と判定されること', () => {
    const id1 = SlotId.create('slot-001');
    const id2 = SlotId.create('slot-001');
    expect(id1.equals(id2)).toBe(true);
  });

  // --- 異常系 ---

  it('null を渡した場合にエラーとなること', () => {
    expect(() => SlotId.create(null as unknown as string)).toThrow('SlotId must not be empty');
  });

  it('空文字を渡した場合にエラーとなること', () => {
    expect(() => SlotId.create('')).toThrow('SlotId must not be empty');
  });

  it('空白のみの文字列を渡した場合にエラーとなること', () => {
    expect(() => SlotId.create('   ')).toThrow('SlotId must not be empty');
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const id = SlotId.create('slot-001');
    expect(id.toString()).toBe('slot-001');
  });
});
