import { OwnerId } from './OwnerId';
import { SlotDate } from './SlotDate';
import { SlotId } from './SlotId';
import { Version } from './Version';
import { Slot } from './Slot';
import { TimeOfDay } from './TimeOfDay';
import { TimeRange } from './TimeRange';
import { Duration } from './Duration';
import { SlotStatus } from './SlotStatus';
import { ReservationId } from './ReservationId';
import {
  SlotOverlapError,
  SlotNotFoundError,
  SlotAlreadyBookedError,
  SlotNotAvailableError,
} from './DomainErrors';

/**
 * DailySlotList - Aggregate Root
 * Manages all slots for a specific owner on a specific date.
 * Enforces slot overlap invariants and optimistic locking.
 */
export class DailySlotList {
  readonly ownerId: OwnerId;
  readonly date: SlotDate;
  private _version: Version;
  private _slots: Slot[];

  private constructor(
    ownerId: OwnerId,
    date: SlotDate,
    version: Version,
    slots: Slot[],
  ) {
    this.ownerId = ownerId;
    this.date = date;
    this._version = version;
    this._slots = [...slots];
  }

  static create(params: {
    ownerId: OwnerId;
    date: SlotDate;
    version?: Version;
    slots?: Slot[];
  }): DailySlotList {
    return new DailySlotList(
      params.ownerId,
      params.date,
      params.version ?? Version.initial(),
      params.slots ?? [],
    );
  }

  get version(): Version {
    return this._version;
  }

  get slots(): ReadonlyArray<Slot> {
    return [...this._slots];
  }

  /** Find a slot by its ID. */
  findSlotById(slotId: SlotId): Slot | null {
    return this._slots.find((s) => s.slotId.equals(slotId)) ?? null;
  }

  /** Get all available slots. */
  getAvailableSlots(): Slot[] {
    return this._slots.filter((s) => s.isAvailable());
  }

  /**
   * Add a slot. Fails if it overlaps with any existing slot.
   */
  addSlot(slot: Slot): void {
    this.assertNoOverlap(slot.timeRange, null);
    this._slots.push(slot);
    this._version = this._version.increment();
  }

  /**
   * Remove a slot by ID. Only available slots can be removed.
   */
  removeSlot(slotId: SlotId): void {
    const slot = this.getSlotOrThrow(slotId);
    if (!slot.isAvailable()) {
      throw new SlotNotAvailableError(slotId.value);
    }
    this._slots = this._slots.filter((s) => !s.slotId.equals(slotId));
    this._version = this._version.increment();
  }

  /**
   * Edit a slot's time range. Only available slots can be edited.
   * The new time range must not overlap with other slots.
   */
  editSlot(slotId: SlotId, newStartTime: TimeOfDay, newEndTime: TimeOfDay): void {
    const slot = this.getSlotOrThrow(slotId);
    if (!slot.isAvailable()) {
      throw new SlotNotAvailableError(slotId.value);
    }
    const newTimeRange = TimeRange.create(newStartTime, newEndTime);
    const newDuration = Duration.create(newTimeRange.durationInMinutes());
    this.assertNoOverlap(newTimeRange, slotId);

    // Replace the slot with an updated copy
    const updatedSlot = Slot.create({
      slotId: slot.slotId,
      startTime: newStartTime,
      endTime: newEndTime,
      durationMinutes: newDuration,
      status: SlotStatus.available(),
      reservationId: null,
    });
    this._slots = this._slots.map((s) =>
      s.slotId.equals(slotId) ? updatedSlot : s,
    );
    this._version = this._version.increment();
  }

  /**
   * Reserve a slot for a reservation.
   */
  reserveSlot(slotId: SlotId, reservationId: ReservationId): void {
    const slot = this.getSlotOrThrow(slotId);
    slot.reserve(reservationId);
    this._version = this._version.increment();
  }

  /**
   * Release a slot from a reservation. ReservationId must match.
   */
  releaseSlot(slotId: SlotId, reservationId: ReservationId): void {
    const slot = this.getSlotOrThrow(slotId);
    slot.release(reservationId);
    this._version = this._version.increment();
  }

  /**
   * Generate slots from business hours and duration.
   * Existing slots (including booked ones) are preserved.
   * Only non-overlapping new slots are added.
   */
  generateSlots(businessStartTime: TimeOfDay, businessEndTime: TimeOfDay, duration: Duration): Slot[] {
    const businessRange = TimeRange.create(businessStartTime, businessEndTime);
    const addedSlots: Slot[] = [];
    let currentMinutes = businessStartTime.toMinutes();
    const endMinutes = businessEndTime.toMinutes();

    while (currentMinutes + duration.minutes <= endMinutes) {
      const slotStart = TimeOfDay.create(
        Math.floor(currentMinutes / 60),
        currentMinutes % 60,
      );
      const slotEndMinutes = currentMinutes + duration.minutes;
      const slotEnd = TimeOfDay.create(
        Math.floor(slotEndMinutes / 60),
        slotEndMinutes % 60,
      );
      const candidateRange = TimeRange.create(slotStart, slotEnd);

      const hasOverlap = this._slots.some((existing) =>
        existing.timeRange.overlaps(candidateRange),
      );

      if (!hasOverlap) {
        const newSlot = Slot.create({
          slotId: SlotId.generate(),
          startTime: slotStart,
          endTime: slotEnd,
          durationMinutes: duration,
          status: SlotStatus.available(),
          reservationId: null,
        });
        this._slots.push(newSlot);
        addedSlots.push(newSlot);
      }

      currentMinutes += duration.minutes;
    }

    if (addedSlots.length > 0) {
      this._version = this._version.increment();
    }

    return addedSlots;
  }

  // --- Private helpers ---

  private getSlotOrThrow(slotId: SlotId): Slot {
    const slot = this.findSlotById(slotId);
    if (!slot) {
      throw new SlotNotFoundError(slotId.value);
    }
    return slot;
  }

  /**
   * Assert that the given time range does not overlap with any existing slot,
   * optionally excluding a specific slot (for edit operations).
   */
  private assertNoOverlap(range: TimeRange, excludeSlotId: SlotId | null): void {
    const overlapping = this._slots.find((s) => {
      if (excludeSlotId && s.slotId.equals(excludeSlotId)) {
        return false;
      }
      return s.timeRange.overlaps(range);
    });
    if (overlapping) {
      throw new SlotOverlapError(
        `Slot overlaps with existing slot ${overlapping.slotId.value} (${overlapping.timeRange.toString()})`,
      );
    }
  }
}
