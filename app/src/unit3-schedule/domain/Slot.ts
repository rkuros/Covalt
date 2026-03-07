import { SlotId } from './SlotId';
import { TimeOfDay } from './TimeOfDay';
import { TimeRange } from './TimeRange';
import { Duration } from './Duration';
import { SlotStatus, SlotStatusEnum } from './SlotStatus';
import { ReservationId } from './ReservationId';
import {
  SlotAlreadyBookedError,
  SlotNotBookedError,
  ReservationIdMismatchError,
} from './DomainErrors';

/**
 * Slot - Entity
 * Represents a reservable time frame. Part of DailySlotList aggregate.
 */
export class Slot {
  readonly slotId: SlotId;
  readonly timeRange: TimeRange;
  readonly duration: Duration;
  private _status: SlotStatus;
  private _reservationId: ReservationId | null;

  private constructor(
    slotId: SlotId,
    timeRange: TimeRange,
    duration: Duration,
    status: SlotStatus,
    reservationId: ReservationId | null,
  ) {
    this.slotId = slotId;
    this.timeRange = timeRange;
    this.duration = duration;
    this._status = status;
    this._reservationId = reservationId;
  }

  static create(params: {
    slotId: SlotId;
    startTime: TimeOfDay;
    endTime: TimeOfDay;
    durationMinutes: Duration;
    status?: SlotStatus;
    reservationId?: ReservationId | null;
  }): Slot {
    const timeRange = TimeRange.create(params.startTime, params.endTime);
    const actualDuration = timeRange.durationInMinutes();
    if (actualDuration !== params.durationMinutes.minutes) {
      throw new Error(
        `Duration (${params.durationMinutes.minutes}min) does not match time range (${actualDuration}min)`,
      );
    }

    const status = params.status ?? SlotStatus.available();
    const reservationId = params.reservationId ?? null;

    if (status.isAvailable() && reservationId !== null) {
      throw new Error('Available slot must not have a reservationId');
    }
    if (status.isBooked() && reservationId === null) {
      throw new Error('Booked slot must have a reservationId');
    }

    return new Slot(
      params.slotId,
      timeRange,
      params.durationMinutes,
      status,
      reservationId,
    );
  }

  get startTime(): TimeOfDay {
    return this.timeRange.startTime;
  }

  get endTime(): TimeOfDay {
    return this.timeRange.endTime;
  }

  get status(): SlotStatus {
    return this._status;
  }

  get reservationId(): ReservationId | null {
    return this._reservationId;
  }

  get durationMinutes(): number {
    return this.duration.minutes;
  }

  isAvailable(): boolean {
    return this._status.isAvailable();
  }

  isBooked(): boolean {
    return this._status.isBooked();
  }

  /**
   * Reserve this slot for the given reservation.
   * Transitions: available -> booked.
   */
  reserve(reservationId: ReservationId): void {
    if (this._status.isBooked()) {
      throw new SlotAlreadyBookedError(this.slotId.value);
    }
    this._status = SlotStatus.booked();
    this._reservationId = reservationId;
  }

  /**
   * Release this slot from the given reservation.
   * Transitions: booked -> available.
   * The reservationId must match.
   */
  release(reservationId: ReservationId): void {
    if (!this._status.isBooked()) {
      throw new SlotNotBookedError(this.slotId.value);
    }
    if (!this._reservationId || !this._reservationId.equals(reservationId)) {
      throw new ReservationIdMismatchError(this.slotId.value);
    }
    this._status = SlotStatus.available();
    this._reservationId = null;
  }

  /** Check if this slot's time range overlaps with another slot. */
  overlapsWith(other: Slot): boolean {
    return this.timeRange.overlaps(other.timeRange);
  }

  overlapsWithRange(range: TimeRange): boolean {
    return this.timeRange.overlaps(range);
  }
}
