import { BusinessHourRepository } from './BusinessHourRepository';
import { BusinessHour } from './BusinessHour';
import { OwnerId } from './OwnerId';
import { DayOfWeek } from './DayOfWeek';

/**
 * InMemoryBusinessHourRepository - In-memory implementation of BusinessHourRepository.
 */
export class InMemoryBusinessHourRepository implements BusinessHourRepository {
  private store: BusinessHour[] = [];

  async findByOwnerIdAndDayOfWeek(
    ownerId: OwnerId,
    dayOfWeek: DayOfWeek,
  ): Promise<BusinessHour | null> {
    return (
      this.store.find(
        (bh) =>
          bh.ownerId.equals(ownerId) && bh.dayOfWeek.equals(dayOfWeek),
      ) ?? null
    );
  }

  async findAllByOwnerId(ownerId: OwnerId): Promise<BusinessHour[]> {
    return this.store.filter((bh) => bh.ownerId.equals(ownerId));
  }

  async save(businessHour: BusinessHour): Promise<void> {
    const index = this.store.findIndex(
      (bh) => bh.businessHourId.equals(businessHour.businessHourId),
    );
    if (index >= 0) {
      this.store[index] = businessHour;
    } else {
      this.store.push(businessHour);
    }
  }

  /** Test helper: clear all data. */
  clear(): void {
    this.store = [];
  }
}
