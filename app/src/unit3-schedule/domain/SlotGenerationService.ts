import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';
import { Duration } from './Duration';
import { Slot } from './Slot';
import { DailySlotList } from './DailySlotList';
import { BusinessHourRepository } from './BusinessHourRepository';
import { ClosedDayRepository } from './ClosedDayRepository';
import { DailySlotListRepository } from './DailySlotListRepository';

/**
 * SlotGenerationService - Domain Service
 *
 * Generates slots automatically based on business hours and duration.
 * Handles hybrid slot generation: auto-generated slots coexist with
 * manually added/edited slots and respect existing booked slots.
 */
export class SlotGenerationService {
  constructor(
    private readonly businessHourRepo: BusinessHourRepository,
    private readonly closedDayRepo: ClosedDayRepository,
    private readonly dailySlotListRepo: DailySlotListRepository,
  ) {}

  /**
   * Generate slots for the given owner, date, and duration.
   *
   * Flow:
   * 1. Determine the day-of-week for the date and fetch BusinessHour.
   * 2. If it is a regular closed day (isBusinessDay=false), generate nothing.
   * 3. Check ClosedDay; if the date is a holiday, generate nothing.
   * 4. Divide the business hour range by the duration and produce candidate slots.
   * 5. Fetch existing DailySlotList and skip candidates that overlap existing slots.
   * 6. Add non-overlapping candidates to the DailySlotList.
   *
   * @returns The newly added slots.
   */
  async generate(
    ownerId: OwnerId,
    date: SlotDate,
    durationMinutes: Duration,
    bufferMinutes: number = 0,
  ): Promise<Slot[]> {
    // 1. Get business hour for the day of week
    const dayOfWeek = date.getDayOfWeek();
    const businessHour = await this.businessHourRepo.findByOwnerIdAndDayOfWeek(
      ownerId,
      dayOfWeek,
    );

    if (!businessHour || !businessHour.isBusinessDay) {
      return [];
    }

    // 2. Check if it's a closed day (holiday)
    const closedDay = await this.closedDayRepo.findByOwnerIdAndDate(
      ownerId,
      date,
    );
    if (closedDay) {
      return [];
    }

    // 3. Get or create the DailySlotList
    let dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(
      ownerId,
      date,
    );
    if (!dailySlotList) {
      dailySlotList = DailySlotList.create({ ownerId, date });
    }

    // 4. Generate slots within the business hours, skipping overlaps
    const startTime = businessHour.startTime!;
    const endTime = businessHour.endTime!;
    const addedSlots = dailySlotList.generateSlots(
      startTime,
      endTime,
      durationMinutes,
      bufferMinutes,
    );

    // 5. Save only if new slots were actually added
    if (addedSlots.length > 0) {
      await this.dailySlotListRepo.save(dailySlotList);
    }

    return addedSlots;
  }
}
