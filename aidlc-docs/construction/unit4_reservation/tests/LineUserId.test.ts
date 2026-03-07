import { describe, it, expect } from 'vitest';
import { LineUserId } from '../src/LineUserId';

describe('LineUserId', () => {
  const VALID_LINE_USER_ID = 'U1234567890abcdef1234567890abcdef';

  // --- 正常系 ---

  it('有効な形式（U + 32桁hex）で生成できること', () => {
    const id = LineUserId.create(VALID_LINE_USER_ID);
    expect(id).not.toBeNull();
    expect(id!.value).toBe(VALID_LINE_USER_ID);
  });

  it('null を許容すること（LINE 未連携のケース）', () => {
    const id = LineUserId.create(null);
    expect(id).toBeNull();
  });

  it('undefined を許容すること', () => {
    const id = LineUserId.create(undefined);
    expect(id).toBeNull();
  });

  it('同じ文字列を持つ2つの LineUserId が等価と判定されること', () => {
    const id1 = LineUserId.create(VALID_LINE_USER_ID);
    const id2 = LineUserId.create(VALID_LINE_USER_ID);
    expect(id1!.equals(id2)).toBe(true);
  });

  it('大文字hex（例: U1234567890ABCDEF1234567890ABCDEF）はエラーとなること（小文字のみ許容）', () => {
    expect(() => LineUserId.create('U1234567890ABCDEF1234567890ABCDEF')).toThrow(
      'LineUserId must match pattern',
    );
  });

  // --- 異常系 ---

  it('U プレフィックスがない文字列を渡した場合にエラーとなること', () => {
    expect(() => LineUserId.create('1234567890abcdef1234567890abcdef')).toThrow(
      'LineUserId must match pattern',
    );
  });

  it('U + 31桁（桁数不足）を渡した場合にエラーとなること', () => {
    expect(() => LineUserId.create('U1234567890abcdef1234567890abcde')).toThrow(
      'LineUserId must match pattern',
    );
  });

  it('U + 33桁（桁数超過）を渡した場合にエラーとなること', () => {
    expect(() => LineUserId.create('U1234567890abcdef1234567890abcdeff')).toThrow(
      'LineUserId must match pattern',
    );
  });

  it('U + 32桁だが hex 以外の文字を含む場合にエラーとなること', () => {
    // 'g' は hex ではない
    expect(() => LineUserId.create('U1234567890abcdef1234567890abcdeg')).toThrow(
      'LineUserId must match pattern',
    );
  });

  it('空文字を渡した場合に null が返ること', () => {
    // 実装上、空文字は null を返す（エラーではなく null）
    const id = LineUserId.create('');
    expect(id).toBeNull();
  });

  // --- equals ---

  it('equals で null を渡した場合に false が返ること', () => {
    const id = LineUserId.create(VALID_LINE_USER_ID);
    expect(id!.equals(null)).toBe(false);
  });

  // --- toString ---

  it('toString が value を返すこと', () => {
    const id = LineUserId.create(VALID_LINE_USER_ID);
    expect(id!.toString()).toBe(VALID_LINE_USER_ID);
  });
});
