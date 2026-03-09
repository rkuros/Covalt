import { NotificationRecord } from './NotificationRecord';
import { NotificationRecordRepository } from './NotificationRecordRepository';

/**
 * NotificationRecordRepository のインメモリ実装。
 * テストおよび開発用。
 */
export class InMemoryNotificationRecordRepository implements NotificationRecordRepository {
  private readonly records: Map<string, NotificationRecord> = new Map();

  async save(record: NotificationRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async findByReservationId(
    reservationId: string,
  ): Promise<NotificationRecord[]> {
    return Array.from(this.records.values()).filter(
      (r) => r.reservationId === reservationId,
    );
  }

  /** テスト用: 全レコードをクリア */
  clear(): void {
    this.records.clear();
  }

  /** テスト用: 保存件数を取得 */
  get size(): number {
    return this.records.size;
  }
}
