import { describe, it, expect } from 'vitest';
import { OwnerId } from '../src/OwnerId';

describe('OwnerId', () => {
  // --- 正常系 ---

  it('有効な文字列で生成できること', () => {
    const id = OwnerId.create('owner-001');
    expect(id.value).toBe('owner-001');
  });

  it('同じ文字列を持つ2つの OwnerId が等価と判定されること', () => {
    const id1 = OwnerId.create('owner-001');
    const id2 = OwnerId.create('owner-001');
    expect(id1.equals(id2)).toBe(true);
  });

  // --- 異常系 ---

  it('null を渡した場合にエラーとなること', () => {
    expect(() => OwnerId.create(null as unknown as string)).toThrow('OwnerId must not be empty');
  });

  it('空文字を渡した場合にエラーとなること', () => {
    expect(() => OwnerId.create('')).toThrow('OwnerId must not be empty');
  });

  it('空白のみの文字列を渡した場合にエラーとなること', () => {
    expect(() => OwnerId.create('   ')).toThrow('OwnerId must not be empty');
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const id = OwnerId.create('owner-001');
    expect(id.toString()).toBe('owner-001');
  });
});
