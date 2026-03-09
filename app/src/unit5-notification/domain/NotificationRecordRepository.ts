import { NotificationRecord } from './NotificationRecord';

/**
 * NotificationRecord の永続化インターフェース。
 */
export interface NotificationRecordRepository {
  save(record: NotificationRecord): Promise<void>;
  findByReservationId(reservationId: string): Promise<NotificationRecord[]>;
}
