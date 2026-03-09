/**
 * ReservationRepository - Reservation 集約の永続化と取得を担うリポジトリインターフェース
 */
import { Reservation } from './Reservation';
import { ReservationId } from './ReservationId';
import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { ReservationStatus } from './ReservationStatus';

export interface ReservationRepository {
  /** 予約の新規作成および更新を永続化する。ReservationHistory を含む集約全体を保存する。 */
  save(reservation: Reservation): Promise<void>;

  /** 予約IDで予約を取得する。ReservationHistory を含む集約全体をロードする。 */
  findById(reservationId: ReservationId): Promise<Reservation | null>;

  /** 顧客IDとオーナーIDで今後の予約一覧を取得する（dateTime が現在以降、status = confirmed）。 */
  findUpcomingByCustomerId(
    customerId: CustomerId,
    ownerId: OwnerId,
  ): Promise<Reservation[]>;

  /** 顧客IDとオーナーIDで過去の予約履歴を取得する。直近順にソート。 */
  findPastByCustomerId(
    customerId: CustomerId,
    ownerId: OwnerId,
  ): Promise<Reservation[]>;

  /** オーナーIDと日付範囲で予約一覧を取得する。 */
  findByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: Date,
    endDate: Date,
  ): Promise<Reservation[]>;

  /** オーナーIDとステータスで予約一覧を取得する。 */
  findByOwnerIdAndStatus(
    ownerId: OwnerId,
    status: ReservationStatus,
  ): Promise<Reservation[]>;

  /** オーナーID、日付範囲、ステータスの複合条件で予約一覧を取得する。 */
  findByOwnerIdAndDateRangeAndStatus(
    ownerId: OwnerId,
    startDate: Date,
    endDate: Date,
    status: ReservationStatus,
  ): Promise<Reservation[]>;
}
