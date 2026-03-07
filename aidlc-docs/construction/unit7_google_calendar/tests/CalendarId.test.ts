import { describe, it, expect } from 'vitest';
import { CalendarId } from '../src/CalendarId';

describe('CalendarId', () => {
  // --- 正常系 ---

  it('2-1. 有効なカレンダーID文字列を指定してインスタンスを生成できる', () => {
    const calendarId = CalendarId.create('primary@gmail.com');
    expect(calendarId).toBeInstanceOf(CalendarId);
  });

  it('2-2. 生成後のプロパティが渡した値と一致する', () => {
    const calendarId = CalendarId.create('owner@example.com');
    expect(calendarId.value).toBe('owner@example.com');
  });

  // --- 異常系 ---

  it('2-3. 空文字の場合、生成時にエラーとなる', () => {
    expect(() => CalendarId.create('')).toThrow('CalendarId は空にできません');
  });

  it('2-4. null / undefined の場合、生成時にエラーとなる', () => {
    expect(() => CalendarId.create(null as unknown as string)).toThrow();
    expect(() => CalendarId.create(undefined as unknown as string)).toThrow();
  });

  // --- 境界値 ---

  it('2-5. 非常に長いカレンダーID文字列を指定した場合でも生成できる（上限なし / Google API 仕様に準拠）', () => {
    const longId = 'a'.repeat(10000);
    const calendarId = CalendarId.create(longId);
    expect(calendarId.value).toBe(longId);
  });

  // --- 等価性 ---

  it('2-6. 同一のカレンダーID値を持つインスタンス同士が等価と判定される', () => {
    const id1 = CalendarId.create('calendar-id-001');
    const id2 = CalendarId.create('calendar-id-001');
    expect(id1.equals(id2)).toBe(true);
  });

  it('2-7. 異なるカレンダーID値を持つインスタンス同士が非等価と判定される', () => {
    const id1 = CalendarId.create('calendar-id-001');
    const id2 = CalendarId.create('calendar-id-002');
    expect(id1.equals(id2)).toBe(false);
  });
});
