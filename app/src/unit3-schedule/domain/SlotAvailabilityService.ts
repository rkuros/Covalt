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
   * 1. Fetch DailySlotList. If slots exist, return them regardless of holiday status.
   * 2. If no slots exist, check ClosedDay / BusinessHour to determine isHoliday flag.
   *
   * スロットが明示的に登録されていれば、休業日・定休日でも表示する（特別営業）。
   */
  async getAvailability(
    ownerId: OwnerId,
    date: SlotDate,
    treatmentDurationMinutes?: number,
  ): Promise<SlotAvailabilityResult> {
    // 1. Get slots first — if slots exist, honor them regardless of holiday
    const dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(
      ownerId,
      date,
    );

    const availableSlots = dailySlotList
      ? dailySlotList.getAvailableSlots(treatmentDurationMinutes)
      : [];

    if (availableSlots.length > 0) {
      return { date, isHoliday: false, availableSlots };
    }

    // 2. No available slots — determine if the day is a holiday for UI hints
    const closedDay = await this.closedDayRepo.findByOwnerIdAndDate(
      ownerId,
      date,
    );
    if (closedDay) {
      return { date, isHoliday: true, availableSlots: [] };
    }

    const dayOfWeek = date.getDayOfWeek();
    const businessHour = await this.businessHourRepo.findByOwnerIdAndDayOfWeek(
      ownerId,
      dayOfWeek,
    );
    const isHoliday = !businessHour || !businessHour.isBusinessDay;

    return { date, isHoliday, availableSlots: [] };
  }
}
