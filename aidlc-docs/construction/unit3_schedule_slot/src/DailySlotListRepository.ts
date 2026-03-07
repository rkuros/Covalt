import { DailySlotList } from './DailySlotList';
import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';
import { SlotId } from './SlotId';
import { Slot } from './Slot';

/**
 * DailySlotListRepository - Repository Interface
 * save() includes optimistic lock verification.
 */
export interface DailySlotListRepository {
  findByOwnerIdAndDate(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<DailySlotList | null>;

  /** Helper: find which DailySlotList contains the given slotId, and return the slot. */
  findSlotById(slotId: SlotId): Promise<{ dailySlotList: DailySlotList; slot: Slot } | null>;

  /** Save with optimistic lock verification. Throws OptimisticLockError on version mismatch. */
  save(dailySlotList: DailySlotList): Promise<void>;
}
