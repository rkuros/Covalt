import { DailySlotListRepository } from './DailySlotListRepository';
import { DailySlotList } from './DailySlotList';
import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';
import { SlotId } from './SlotId';
import { Slot } from './Slot';
import { OptimisticLockError } from './DomainErrors';

/**
 * InMemoryDailySlotListRepository - In-memory implementation of DailySlotListRepository.
 * Includes optimistic lock verification on save().
 */
export class InMemoryDailySlotListRepository implements DailySlotListRepository {
  private store: DailySlotList[] = [];
  /** Tracks the persisted version for optimistic locking. */
  private versionMap = new Map<string, number>();

  private toKey(ownerId: OwnerId, date: SlotDate): string {
    return `${ownerId.value}:${date.value}`;
  }

  async findByOwnerIdAndDate(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<DailySlotList | null> {
    const found = this.store.find(
      (dsl) => dsl.ownerId.equals(ownerId) && dsl.date.equals(date),
    );
    if (!found) return null;
    // Return a deep copy to enable proper optimistic lock detection
    return DailySlotList.create({
      ownerId: found.ownerId,
      date: found.date,
      version: found.version,
      slots: [...found.slots],
    });
  }

  async findSlotById(
    slotId: SlotId,
  ): Promise<{ dailySlotList: DailySlotList; slot: Slot } | null> {
    for (const dsl of this.store) {
      const slot = dsl.findSlotById(slotId);
      if (slot) {
        return { dailySlotList: dsl, slot };
      }
    }
    return null;
  }

  async save(dailySlotList: DailySlotList): Promise<void> {
    const key = this.toKey(dailySlotList.ownerId, dailySlotList.date);
    const existingIndex = this.store.findIndex(
      (dsl) =>
        dsl.ownerId.equals(dailySlotList.ownerId) &&
        dsl.date.equals(dailySlotList.date),
    );

    if (existingIndex >= 0) {
      // Optimistic lock check: the version we loaded must match the stored version
      const storedVersion = this.versionMap.get(key);
      if (storedVersion !== undefined) {
        // The incoming dailySlotList has already been incremented by domain operations.
        // The stored version should be less than the new version.
        // If someone else updated in between, storedVersion would have been incremented already.
        const expectedPreviousVersion = dailySlotList.version.value - 1;
        if (storedVersion > expectedPreviousVersion) {
          throw new OptimisticLockError();
        }
      }
      this.store[existingIndex] = dailySlotList;
    } else {
      this.store.push(dailySlotList);
    }

    this.versionMap.set(key, dailySlotList.version.value);
  }

  /** Test helper: clear all data. */
  clear(): void {
    this.store = [];
    this.versionMap.clear();
  }
}
