import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';
import { Slot } from './Slot';
import { BusinessHourRepository } from './BusinessHourRepository';
import { ClosedDayRepository } from './ClosedDayRepository';
import { DailySlotListRepository } from './DailySlotListRepository';

/**
 * Result of a slot availability query.
 */
export interface SlotAvailabilityResult {
  readonly date: SlotDate;
  readonly isHoliday: boolean;
  readonly availableSlots: Slot[];
}

/**
 * SlotAvailabilityService - Domain Service
 *
 * Queries slot availability considering closed days and business hours.
 * Read-only service that does not modify any aggregate.
 */
export class SlotAvailabilityService {
  constructor(
    private readonly businessHourRepo: BusinessHourRepository,
    private readonly closedDayRepo: ClosedDayRepository,
    private readonly dailySlotListRepo: DailySlotListRepository,
  ) {}

  /**
   * Check slot availability for the given owner and date.
   *
   * Flow:
   * 1. Check ClosedDay; if holiday, return isHoliday=true with empty slots.
   * 2. Check BusinessHour; if regular closed day, return empty slots.
   * 3. Fetch DailySlotList and return only available slots.
   */
  async getAvailability(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<SlotAvailabilityResult> {
    // 1. Check for closed day (holiday)
    const closedDay = await this.closedDayRepo.findByOwnerIdAndDate(ownerId, date);
    if (closedDay) {
      return { date, isHoliday: true, availableSlots: [] };
    }

    // 2. Check business hour for the day of week
    const dayOfWeek = date.getDayOfWeek();
    const businessHour = await this.businessHourRepo.findByOwnerIdAndDayOfWeek(
      ownerId,
      dayOfWeek,
    );
    if (!businessHour || !businessHour.isBusinessDay) {
      return { date, isHoliday: false, availableSlots: [] };
    }

    // 3. Get slots and filter to available only
    const dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(ownerId, date);
    if (!dailySlotList) {
      return { date, isHoliday: false, availableSlots: [] };
    }

    return {
      date,
      isHoliday: false,
      availableSlots: dailySlotList.getAvailableSlots(),
    };
  }
}
