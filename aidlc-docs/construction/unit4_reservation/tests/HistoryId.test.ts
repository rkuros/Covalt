import { describe, it, expect } from 'vitest';
import { HistoryId } from '../src/HistoryId';

describe('HistoryId', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

  // --- 正常系 ---

  it('有効な UUID v4 文字列で生成できること', () => {
    const id = HistoryId.create(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });

  it('同じ UUID 文字列を持つ2つの HistoryId が等価と判定されること', () => {
    const id1 = HistoryId.create(VALID_UUID);
    const id2 = HistoryId.create(VALID_UUID);
    expect(id1.equals(id2)).toBe(true);
  });

  // --- 異常系 ---

  it('null を渡した場合にエラーとなること', () => {
    expect(() => HistoryId.create(null as unknown as string)).toThrow();
  });

  it('空文字を渡した場合にエラーとなること', () => {
    expect(() => HistoryId.create('')).toThrow('HistoryId must not be empty');
  });

  it('UUID v4 形式でない文字列を渡した場合にエラーとなること', () => {
    expect(() => HistoryId.create('not-a-uuid')).toThrow('HistoryId must be a valid UUID v4');
  });

  // --- generate ---

  it('generate で有効な UUID v4 が自動生成されること', () => {
    const id = HistoryId.generate();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const id = HistoryId.create(VALID_UUID);
    expect(id.toString()).toBe(VALID_UUID);
  });
});
