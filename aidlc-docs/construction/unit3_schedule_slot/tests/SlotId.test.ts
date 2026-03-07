import { describe, it, expect } from 'vitest';
import { SlotId } from '../src/SlotId';

describe('SlotId', () => {
  // 正常系
  it('有効な文字列で生成できること', () => {
    const slotId = SlotId.create('slot-001');
    expect(slotId.value).toBe('slot-001');
  });

  // 異常系
  it('null で生成するとバリデーションエラーになること', () => {
    expect(() => SlotId.create(null as unknown as string)).toThrow();
  });

  it('空文字で生成するとバリデーションエラーになること', () => {
    expect(() => SlotId.create('')).toThrow();
  });

  // 等価性
  it('同一の value を持つ SlotId 同士は等価であること', () => {
    const a = SlotId.create('slot-001');
    const b = SlotId.create('slot-001');
    expect(a.equals(b)).toBe(true);
  });

  it('異なる value を持つ SlotId 同士は等価でないこと', () => {
    const a = SlotId.create('slot-001');
    const b = SlotId.create('slot-002');
    expect(a.equals(b)).toBe(false);
  });
});
