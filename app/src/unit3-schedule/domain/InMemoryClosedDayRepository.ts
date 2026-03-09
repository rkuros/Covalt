import { ClosedDayRepository } from './ClosedDayRepository';
import { ClosedDay } from './ClosedDay';
import { ClosedDayId } from './ClosedDayId';
import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';

/**
 * InMemoryClosedDayRepository - In-memory implementation of ClosedDayRepository.
 */
export class InMemoryClosedDayRepository implements ClosedDayRepository {
  private store: ClosedDay[] = [];

  async findById(closedDayId: ClosedDayId): Promise<ClosedDay | null> {
    return this.store.find((cd) => cd.closedDayId.equals(closedDayId)) ?? null;
  }

  async findByOwnerIdAndDate(
    ownerId: OwnerId,
    date: SlotDate,
  ): Promise<ClosedDay | null> {
    return (
      this.store.find(
        (cd) => cd.ownerId.equals(ownerId) && cd.date.equals(date),
      ) ?? null
    );
  }

  async findAllByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: SlotDate,
    endDate: SlotDate,
  ): Promise<ClosedDay[]> {
    return this.store.filter(
      (cd) =>
        cd.ownerId.equals(ownerId) &&
        cd.date.value >= startDate.value &&
        cd.date.value <= endDate.value,
    );
  }

  async save(closedDay: ClosedDay): Promise<void> {
    const index = this.store.findIndex((cd) =>
      cd.closedDayId.equals(closedDay.closedDayId),
    );
    if (index >= 0) {
      this.store[index] = closedDay;
    } else {
      this.store.push(closedDay);
    }
  }

  async delete(closedDay: ClosedDay): Promise<void> {
    this.store = this.store.filter(
      (cd) => !cd.closedDayId.equals(closedDay.closedDayId),
    );
  }

  /** Test helper: clear all data. */
  clear(): void {
    this.store = [];
  }
}
