import { ClosedDay } from './ClosedDay';
import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';

/**
 * ClosedDayRepository - Repository Interface
 */
export interface ClosedDayRepository {
  findByOwnerIdAndDate(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<ClosedDay | null>;

  findAllByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: SlotDate,
    endDate: SlotDate,
  ): Promise<ClosedDay[]>;

  save(closedDay: ClosedDay): Promise<void>;

  delete(closedDay: ClosedDay): Promise<void>;
}
