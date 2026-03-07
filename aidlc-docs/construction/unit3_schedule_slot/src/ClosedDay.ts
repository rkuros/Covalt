import { ClosedDayId } from './ClosedDayId';
import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';

/**
 * ClosedDay - Entity / Aggregate Root
 * Represents a specific date marked as a closed (holiday) day.
 * Separate from regular weekly closed days (isBusinessDay in BusinessHour).
 */
export class ClosedDay {
  readonly closedDayId: ClosedDayId;
  readonly ownerId: OwnerId;
  readonly date: SlotDate;
  readonly reason: string | null;

  private constructor(
    closedDayId: ClosedDayId,
    ownerId: OwnerId,
    date: SlotDate,
    reason: string | null,
  ) {
    this.closedDayId = closedDayId;
    this.ownerId = ownerId;
    this.date = date;
    this.reason = reason;
  }

  static create(params: {
    closedDayId: ClosedDayId;
    ownerId: OwnerId;
    date: SlotDate;
    reason?: string | null;
  }): ClosedDay {
    const reason = params.reason ?? null;
    if (reason !== null && reason.length > 200) {
      throw new Error('ClosedDay reason must be at most 200 characters');
    }
    return new ClosedDay(
      params.closedDayId,
      params.ownerId,
      params.date,
      reason,
    );
  }
}
