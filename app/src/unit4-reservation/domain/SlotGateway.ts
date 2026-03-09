/**
 * SlotGateway - Unit 3（スケジュール・空き枠管理）のスロット API 用 Gateway インターフェース
 */
import { OwnerId } from './OwnerId';
import { SlotId } from './SlotId';
import { ReservationId } from './ReservationId';

export interface SlotInfo {
  readonly slotId: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes: number;
  readonly status: string;
}

export interface SlotListResult {
  readonly date: string;
  readonly isHoliday?: boolean;
  readonly slots: readonly SlotInfo[];
}

export interface SlotReserveResult {
  readonly slotId: string;
  readonly status: 'booked';
  readonly reservationId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes: number;
}

export interface SlotReleaseResult {
  readonly slotId: string;
  readonly status: 'available';
}

export interface SlotGateway {
  /** 指定日の空きスロット一覧を取得する。 */
  findAvailableSlots(ownerId: OwnerId, date: string): Promise<SlotListResult>;

  /** スロットを予約確保する。競合時は SLOT_ALREADY_BOOKED エラーをスローする。 */
  reserveSlot(
    slotId: SlotId,
    reservationId: ReservationId,
    treatmentDurationMinutes?: number,
  ): Promise<SlotReserveResult>;

  /** スロットを解放する（キャンセル・変更時）。 */
  releaseSlot(
    slotId: SlotId,
    reservationId: ReservationId,
  ): Promise<SlotReleaseResult>;
}
