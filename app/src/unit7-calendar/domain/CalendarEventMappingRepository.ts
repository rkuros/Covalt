import { CalendarEventMapping } from './CalendarEventMapping';

/**
 * リポジトリインターフェース: CalendarEventMappingRepository
 *
 * CalendarEventMapping エンティティの永続化を担う。
 */
export interface CalendarEventMappingRepository {
  /**
   * ID でマッピングを取得する。
   */
  findById(id: string): Promise<CalendarEventMapping | null>;

  /**
   * 予約 ID でアクティブなマッピングを取得する。
   */
  findByReservationId(reservationId: string): Promise<CalendarEventMapping | null>;

  /**
   * マッピングを保存（新規作成・更新）する。
   */
  save(mapping: CalendarEventMapping): Promise<void>;

  /**
   * マッピングを削除する。
   */
  delete(id: string): Promise<void>;
}
