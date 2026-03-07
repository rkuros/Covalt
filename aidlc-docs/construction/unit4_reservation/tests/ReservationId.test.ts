import { describe, it, expect } from 'vitest';
import { ReservationId } from '../src/ReservationId';

describe('ReservationId', () => {
  const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
  const VALID_UUID_2 = '6ba7b810-9dad-41d8-80b4-00c04fd430c8';

  // --- 正常系 ---

  it('有効な UUID v4 文字列で生成できること', () => {
    const id = ReservationId.create(VALID_UUID);
    expect(id.value).toBe(VALID_UUID);
  });

  it('同じ UUID 文字列を持つ2つの ReservationId が等価と判定されること', () => {
    const id1 = ReservationId.create(VALID_UUID);
    const id2 = ReservationId.create(VALID_UUID);
    expect(id1.equals(id2)).toBe(true);
  });

  it('異なる UUID 文字列を持つ2つの ReservationId が非等価と判定されること', () => {
    const id1 = ReservationId.create(VALID_UUID);
    const id2 = ReservationId.create(VALID_UUID_2);
    expect(id1.equals(id2)).toBe(false);
  });

  // --- 異常系 ---

  it('null を渡した場合にエラーとなること', () => {
    expect(() => ReservationId.create(null as unknown as string)).toThrow();
  });

  it('空文字を渡した場合にエラーとなること', () => {
    expect(() => ReservationId.create('')).toThrow('ReservationId must not be empty');
  });

  it('UUID v4 形式でない文字列（例: abc-123）を渡した場合にエラーとなること', () => {
    expect(() => ReservationId.create('abc-123')).toThrow('ReservationId must be a valid UUID v4');
  });

  it('UUID v4 に近いが不正な形式（桁数不足）を渡した場合にエラーとなること', () => {
    // 最後のセクションの桁数を1つ減らした不正な UUID
    expect(() => ReservationId.create('550e8400-e29b-41d4-a716-44665544000')).toThrow(
      'ReservationId must be a valid UUID v4',
    );
  });

  it('UUID v4 に近いが不正文字を含む場合にエラーとなること', () => {
    // 'g' は hex 文字ではない
    expect(() => ReservationId.create('550e8400-e29b-41d4-a716-44665544000g')).toThrow(
      'ReservationId must be a valid UUID v4',
    );
  });

  // --- generate ---

  it('generate で有効な UUID v4 が自動生成されること', () => {
    const id = ReservationId.generate();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const id = ReservationId.create(VALID_UUID);
    expect(id.toString()).toBe(VALID_UUID);
  });
});
