import { CalendarEventMapping } from './CalendarEventMapping';
import { CalendarEventMappingRepository } from './CalendarEventMappingRepository';

/**
 * インメモリ実装: CalendarEventMappingRepository
 *
 * テスト・開発用のインメモリリポジトリ。
 */
export class InMemoryCalendarEventMappingRepository implements CalendarEventMappingRepository {
  private readonly store = new Map<string, CalendarEventMapping>();

  async findById(id: string): Promise<CalendarEventMapping | null> {
    return this.store.get(id) ?? null;
  }

  async findByReservationId(reservationId: string): Promise<CalendarEventMapping | null> {
    for (const mapping of this.store.values()) {
      if (mapping.reservationId === reservationId && mapping.isActive()) {
        return mapping;
      }
    }
    return null;
  }

  async save(mapping: CalendarEventMapping): Promise<void> {
    this.store.set(mapping.id, mapping);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
