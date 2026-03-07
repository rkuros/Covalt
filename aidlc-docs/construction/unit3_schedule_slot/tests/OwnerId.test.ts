import { describe, it, expect } from 'vitest';
import { OwnerId } from '../src/OwnerId';

describe('OwnerId', () => {
  // 正常系
  it('有効な文字列で生成できること', () => {
    const ownerId = OwnerId.create('owner-001');
    expect(ownerId.value).toBe('owner-001');
  });

  // 異常系
  it('null で生成するとバリデーションエラーになること', () => {
    expect(() => OwnerId.create(null as unknown as string)).toThrow();
  });

  it('空文字で生成するとバリデーションエラーになること', () => {
    expect(() => OwnerId.create('')).toThrow();
  });

  // 等価性
  it('同一の value を持つ OwnerId 同士は等価であること', () => {
    const a = OwnerId.create('owner-001');
    const b = OwnerId.create('owner-001');
    expect(a.equals(b)).toBe(true);
  });

  it('異なる value を持つ OwnerId 同士は等価でないこと', () => {
    const a = OwnerId.create('owner-001');
    const b = OwnerId.create('owner-002');
    expect(a.equals(b)).toBe(false);
  });
});
