import { BusinessHourId } from './BusinessHourId';
import { OwnerId } from './OwnerId';
import { DayOfWeek } from './DayOfWeek';
import { TimeOfDay } from './TimeOfDay';
import { TimeRange } from './TimeRange';

/**
 * BusinessHour - Entity / Aggregate Root
 * Represents the business hours for a specific day of the week for an owner.
 */
export class BusinessHour {
  readonly businessHourId: BusinessHourId;
  readonly ownerId: OwnerId;
  readonly dayOfWeek: DayOfWeek;
  private _startTime: TimeOfDay | null;
  private _endTime: TimeOfDay | null;
  private _isBusinessDay: boolean;

  private constructor(
    businessHourId: BusinessHourId,
    ownerId: OwnerId,
    dayOfWeek: DayOfWeek,
    startTime: TimeOfDay | null,
    endTime: TimeOfDay | null,
    isBusinessDay: boolean,
  ) {
    this.businessHourId = businessHourId;
    this.ownerId = ownerId;
    this.dayOfWeek = dayOfWeek;
    this._startTime = startTime;
    this._endTime = endTime;
    this._isBusinessDay = isBusinessDay;
  }

  static create(params: {
    businessHourId: BusinessHourId;
    ownerId: OwnerId;
    dayOfWeek: DayOfWeek;
    startTime: TimeOfDay;
    endTime: TimeOfDay;
    isBusinessDay: boolean;
  }): BusinessHour {
    if (params.isBusinessDay) {
      if (!params.startTime.isBefore(params.endTime)) {
        throw new Error('startTime must be before endTime when isBusinessDay is true');
      }
    }
    return new BusinessHour(
      params.businessHourId,
      params.ownerId,
      params.dayOfWeek,
      params.isBusinessDay ? params.startTime : null,
      params.isBusinessDay ? params.endTime : null,
      params.isBusinessDay,
    );
  }

  get startTime(): TimeOfDay | null {
    return this._startTime;
  }

  get endTime(): TimeOfDay | null {
    return this._endTime;
  }

  get isBusinessDay(): boolean {
    return this._isBusinessDay;
  }

  /** Get the time range for this business hour. Only valid when isBusinessDay is true. */
  getTimeRange(): TimeRange | null {
    if (!this._isBusinessDay || !this._startTime || !this._endTime) {
      return null;
    }
    return TimeRange.create(this._startTime, this._endTime);
  }

  /** Update the business hours for this day. */
  setBusinessHour(startTime: TimeOfDay, endTime: TimeOfDay): void {
    if (!startTime.isBefore(endTime)) {
      throw new Error('startTime must be before endTime');
    }
    this._startTime = startTime;
    this._endTime = endTime;
    this._isBusinessDay = true;
  }

  /** Mark this day as a regular closed day (day off). */
  setAsClosedDay(): void {
    this._isBusinessDay = false;
    this._startTime = null;
    this._endTime = null;
  }

  /** Restore this day as a business day with the given hours. */
  setAsBusinessDay(startTime: TimeOfDay, endTime: TimeOfDay): void {
    if (!startTime.isBefore(endTime)) {
      throw new Error('startTime must be before endTime');
    }
    this._startTime = startTime;
    this._endTime = endTime;
    this._isBusinessDay = true;
  }
}
