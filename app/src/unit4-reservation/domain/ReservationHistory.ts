/**
 * ReservationHistory - 予約の変更操作を記録するエンティティ
 *
 * Reservation 集約内に含まれ、集約ルート（Reservation）経由でのみ作成される。
 */
import { HistoryId } from './HistoryId';
import { ChangeType } from './ChangeType';
import { ReservationDateTime } from './ReservationDateTime';
import { SlotId } from './SlotId';
import { ActorType } from './ActorType';

export interface ReservationHistoryProps {
  readonly historyId: HistoryId;
  readonly changeType: ChangeType;
  readonly previousDateTime: ReservationDateTime | null;
  readonly newDateTime: ReservationDateTime | null;
  readonly previousSlotId: SlotId | null;
  readonly newSlotId: SlotId | null;
  readonly changedBy: ActorType;
  readonly changedAt: Date;
}

export class ReservationHistory {
  readonly historyId: HistoryId;
  readonly changeType: ChangeType;
  readonly previousDateTime: ReservationDateTime | null;
  readonly newDateTime: ReservationDateTime | null;
  readonly previousSlotId: SlotId | null;
  readonly newSlotId: SlotId | null;
  readonly changedBy: ActorType;
  readonly changedAt: Date;

  private constructor(props: ReservationHistoryProps) {
    this.historyId = props.historyId;
    this.changeType = props.changeType;
    this.previousDateTime = props.previousDateTime;
    this.newDateTime = props.newDateTime;
    this.previousSlotId = props.previousSlotId;
    this.newSlotId = props.newSlotId;
    this.changedBy = props.changedBy;
    this.changedAt = props.changedAt;
  }

  /** modified 履歴を作成する。変更前後の日時・スロットIDを記録する。 */
  static createModified(params: {
    previousDateTime: ReservationDateTime;
    newDateTime: ReservationDateTime;
    previousSlotId: SlotId;
    newSlotId: SlotId;
    changedBy: ActorType;
    now?: Date;
  }): ReservationHistory {
    return new ReservationHistory({
      historyId: HistoryId.generate(),
      changeType: ChangeType.Modified,
      previousDateTime: params.previousDateTime,
      newDateTime: params.newDateTime,
      previousSlotId: params.previousSlotId,
      newSlotId: params.newSlotId,
      changedBy: params.changedBy,
      changedAt: params.now ?? new Date(),
    });
  }

  /** cancelled 履歴を作成する。 */
  static createCancelled(params: {
    changedBy: ActorType;
    now?: Date;
  }): ReservationHistory {
    return new ReservationHistory({
      historyId: HistoryId.generate(),
      changeType: ChangeType.Cancelled,
      previousDateTime: null,
      newDateTime: null,
      previousSlotId: null,
      newSlotId: null,
      changedBy: params.changedBy,
      changedAt: params.now ?? new Date(),
    });
  }

  /** completed 履歴を作成する。 */
  static createCompleted(params: { now?: Date }): ReservationHistory {
    return new ReservationHistory({
      historyId: HistoryId.generate(),
      changeType: ChangeType.Completed,
      previousDateTime: null,
      newDateTime: null,
      previousSlotId: null,
      newSlotId: null,
      changedBy: ActorType.Owner,
      changedAt: params.now ?? new Date(),
    });
  }

  /** 永続化されたデータから復元する。 */
  static reconstruct(props: ReservationHistoryProps): ReservationHistory {
    return new ReservationHistory(props);
  }
}
