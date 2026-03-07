import { describe, it, expect } from 'vitest';
import { CalendarEventMapping } from '../src/CalendarEventMapping';
import { InMemoryCalendarEventMappingRepository } from '../src/InMemoryCalendarEventMappingRepository';

describe('CalendarEventMapping', () => {
  // --- 正常系 ---

  it('5-1. reservationId と Google イベント ID を指定してインスタンスを生成できる', () => {
    const mapping = CalendarEventMapping.create(
      'reservation-001',
      'owner-001',
      'google-event-001',
      'calendar-001',
    );
    expect(mapping).toBeInstanceOf(CalendarEventMapping);
  });

  it('5-2. 生成後に reservationId と Google イベント ID を参照できる', () => {
    const mapping = CalendarEventMapping.create(
      'reservation-001',
      'owner-001',
      'google-event-001',
      'calendar-001',
    );
    expect(mapping.reservationId).toBe('reservation-001');
    expect(mapping.googleEventId).toBe('google-event-001');
    expect(mapping.ownerId).toBe('owner-001');
    expect(mapping.calendarId).toBe('calendar-001');
    expect(mapping.active).toBe(true);
  });

  it('5-3. マッピングを無効化（削除マーク）できる（reservation.cancelled 処理用）', () => {
    const mapping = CalendarEventMapping.create(
      'reservation-001',
      'owner-001',
      'google-event-001',
      'calendar-001',
    );
    expect(mapping.isActive()).toBe(true);

    mapping.deactivate();
    expect(mapping.isActive()).toBe(false);
    expect(mapping.active).toBe(false);
  });

  // --- 異常系 ---

  it('5-4. reservationId が空文字の場合、生成時にエラーとなる', () => {
    expect(() =>
      CalendarEventMapping.create('', 'owner-001', 'google-event-001', 'calendar-001'),
    ).toThrow('reservationId は必須です');
  });

  it('5-5. Google イベント ID が空文字の場合、生成時にエラーとなる', () => {
    expect(() =>
      CalendarEventMapping.create('reservation-001', 'owner-001', '', 'calendar-001'),
    ).toThrow('googleEventId は必須です');
  });

  it('5-6. 既に無効化済みのマッピングを再度無効化した場合、エラーにならない', () => {
    const mapping = CalendarEventMapping.create(
      'reservation-001',
      'owner-001',
      'google-event-001',
      'calendar-001',
    );
    mapping.deactivate();
    expect(mapping.isActive()).toBe(false);

    // 再度 deactivate してもエラーにならない
    expect(() => mapping.deactivate()).not.toThrow();
    expect(mapping.isActive()).toBe(false);
  });

  // --- 冪等性（5.2 可用性・耐障害性） ---

  it('5-7. 同一 reservationId に対して既にマッピングが存在する場合、findByReservationId で検出できる', async () => {
    const repository = new InMemoryCalendarEventMappingRepository();

    const mapping1 = CalendarEventMapping.create(
      'reservation-001',
      'owner-001',
      'google-event-001',
      'calendar-001',
    );
    await repository.save(mapping1);

    // 同一 reservationId のマッピングが存在するか確認
    const existing = await repository.findByReservationId('reservation-001');
    expect(existing).not.toBeNull();
    expect(existing!.reservationId).toBe('reservation-001');
  });

  it('5-8. マッピングが存在しない reservationId に対する検索で null が返る', async () => {
    const repository = new InMemoryCalendarEventMappingRepository();

    const result = await repository.findByReservationId('non-existent-reservation');
    expect(result).toBeNull();
  });
});
