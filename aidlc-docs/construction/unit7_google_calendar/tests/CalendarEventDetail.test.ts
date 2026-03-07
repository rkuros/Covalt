import { describe, it, expect } from 'vitest';
import { CalendarEventDetail } from '../src/CalendarEventDetail';

describe('CalendarEventDetail', () => {
  // --- 正常系 ---

  it('3-1. タイトル、開始日時、終了日時、説明を指定してインスタンスを生成できる', () => {
    const start = new Date('2026-06-15T10:00:00Z');
    const end = new Date('2026-06-15T11:00:00Z');
    const detail = CalendarEventDetail.create('予約: 田中太郎', start, end, '顧客名: 田中太郎');
    expect(detail).toBeInstanceOf(CalendarEventDetail);
  });

  it('3-2. 予約情報（customerName, dateTime, durationMinutes）から CalendarEventDetail を構築できる', () => {
    const detail = CalendarEventDetail.fromReservation(
      '田中太郎',
      '2026-06-15T10:00:00Z',
      60,
    );
    expect(detail).toBeInstanceOf(CalendarEventDetail);
  });

  it('3-3. タイトルに顧客名が含まれること（BR-2.4: カレンダー予定に顧客名が記載される）', () => {
    const detail = CalendarEventDetail.fromReservation(
      '田中太郎',
      '2026-06-15T10:00:00Z',
      60,
    );
    expect(detail.title).toContain('田中太郎');
  });

  it('3-4. 開始日時が dateTime と一致すること', () => {
    const dateTime = '2026-06-15T10:00:00Z';
    const detail = CalendarEventDetail.fromReservation('田中太郎', dateTime, 60);
    expect(detail.startDateTime.getTime()).toBe(new Date(dateTime).getTime());
  });

  it('3-5. 終了日時が dateTime + durationMinutes と一致すること（BR-2.4: 予約日時が記載される）', () => {
    const dateTime = '2026-06-15T10:00:00Z';
    const durationMinutes = 60;
    const detail = CalendarEventDetail.fromReservation('田中太郎', dateTime, durationMinutes);

    const expectedEnd = new Date(new Date(dateTime).getTime() + durationMinutes * 60 * 1000);
    expect(detail.endDateTime.getTime()).toBe(expectedEnd.getTime());
  });

  // --- 異常系 ---

  it('3-6. タイトルが空文字の場合、生成時にエラーとなる', () => {
    const start = new Date('2026-06-15T10:00:00Z');
    const end = new Date('2026-06-15T11:00:00Z');
    expect(() => CalendarEventDetail.create('', start, end, '説明')).toThrow('タイトルは必須です');
  });

  it('3-7. 開始日時が null の場合、生成時にエラーとなる', () => {
    const end = new Date('2026-06-15T11:00:00Z');
    expect(() =>
      CalendarEventDetail.create('タイトル', null as unknown as Date, end, '説明'),
    ).toThrow('開始日時は有効な日付である必要があります');
  });

  it('3-8. 終了日時が null の場合、生成時にエラーとなる', () => {
    const start = new Date('2026-06-15T10:00:00Z');
    expect(() =>
      CalendarEventDetail.create('タイトル', start, null as unknown as Date, '説明'),
    ).toThrow('終了日時は有効な日付である必要があります');
  });

  it('3-9. 終了日時が開始日時より前の場合、生成時にエラーとなる', () => {
    const start = new Date('2026-06-15T11:00:00Z');
    const end = new Date('2026-06-15T10:00:00Z');
    expect(() => CalendarEventDetail.create('タイトル', start, end, '説明')).toThrow(
      '終了日時は開始日時より後である必要があります',
    );
  });

  // --- 境界値 ---

  it('3-10. durationMinutes が 0 の場合、エラーとなる（最小15分だが、0は正の数でないためエラー）', () => {
    expect(() =>
      CalendarEventDetail.fromReservation('田中太郎', '2026-06-15T10:00:00Z', 0),
    ).toThrow('durationMinutes は正の数である必要があります');
  });

  it('3-11. durationMinutes が 1 の場合、終了日時が開始日時の1分後となる', () => {
    const dateTime = '2026-06-15T10:00:00Z';
    const detail = CalendarEventDetail.fromReservation('田中太郎', dateTime, 1);

    const expectedEnd = new Date(new Date(dateTime).getTime() + 1 * 60 * 1000);
    expect(detail.endDateTime.getTime()).toBe(expectedEnd.getTime());
  });

  it('3-12. durationMinutes が 1440（24時間）の場合でも正常に生成できる', () => {
    const dateTime = '2026-06-15T10:00:00Z';
    const detail = CalendarEventDetail.fromReservation('田中太郎', dateTime, 1440);

    const expectedEnd = new Date(new Date(dateTime).getTime() + 1440 * 60 * 1000);
    expect(detail.endDateTime.getTime()).toBe(expectedEnd.getTime());
  });

  it('3-10 追加. durationMinutes が負の値の場合、エラーとなる', () => {
    expect(() =>
      CalendarEventDetail.fromReservation('田中太郎', '2026-06-15T10:00:00Z', -30),
    ).toThrow('durationMinutes は正の数である必要があります');
  });
});
