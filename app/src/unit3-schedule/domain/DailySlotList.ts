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
  private readonly _loadedVersion: Version;
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
    this._loadedVersion = version;
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

  get loadedVersion(): Version {
    return this._loadedVersion;
  }

  get slots(): ReadonlyArray<Slot> {
    return [...this._slots];
  }

  /** Find a slot by its ID. */
  findSlotById(slotId: SlotId): Slot | null {
    return this._slots.find((s) => s.slotId.equals(slotId)) ?? null;
  }

  /**
   * Get available slots, excluding those that conflict with booked treatments.
   *
   * @param treatmentDurationMinutes - the duration of a new potential treatment.
   *   When provided, an available slot is excluded if a treatment of this length
   *   starting at the slot's start time would overlap with any booked treatment window.
   *   When omitted, uses each slot's own duration for the overlap check.
   */
  getAvailableSlots(treatmentDurationMinutes?: number): Slot[] {
    const bookedSlots = this._slots.filter((s) => s.isBooked());
    return this._slots.filter((s) => {
      if (!s.isAvailable()) return false;
      return !bookedSlots.some((booked) => {
        // Booked treatment window: startTime → startTime + effectiveTreatmentMinutes
        const bookedStartMin = booked.startTime.toMinutes();
        const bookedEndMin = bookedStartMin + booked.effectiveTreatmentMinutes;

        // Candidate treatment window: slotStart → slotStart + treatmentDuration
        const candidateDur = treatmentDurationMinutes ?? s.durationMinutes;
        const candidateStartMin = s.startTime.toMinutes();
        const candidateEndMin = candidateStartMin + candidateDur;

        // Standard overlap: candidateStart < bookedEnd AND bookedStart < candidateEnd
        return (
          candidateStartMin < bookedEndMin && bookedStartMin < candidateEndMin
        );
      });
    });
  }

  /**
   * Get visible slots for owner view: booked slots + non-blocked available slots.
   * Blocked available slots (overlapping with a booked treatment window) are excluded.
   */
  getVisibleSlots(treatmentDurationMinutes?: number): Slot[] {
    const bookedSlots = this._slots.filter((s) => s.isBooked());
    const availableSlots = this.getAvailableSlots(treatmentDurationMinutes);
    return [...bookedSlots, ...availableSlots].sort(
      (a, b) => a.startTime.toMinutes() - b.startTime.toMinutes(),
    );
  }

  /**
   * Add a slot. Exact duplicates (same start+end time) are rejected.
   * Overlapping time ranges are allowed by design — when one slot is
   * booked, overlapping available slots are hidden from customers.
   */
  addSlot(slot: Slot): void {
    const isDuplicate = this._slots.some(
      (s) =>
        s.startTime.equals(slot.startTime) && s.endTime.equals(slot.endTime),
    );
    if (isDuplicate) return;
    this._slots.push(slot);
    this._version = this._version.increment();
  }

  /**
   * Add a slot, skipping the overlap check.
   * Exact duplicates (same start+end time) are skipped.
   * Returns true if the slot was added, false if duplicate.
   */
  addSlotForce(slot: Slot): boolean {
    const isDuplicate = this._slots.some(
      (s) =>
        s.startTime.equals(slot.startTime) && s.endTime.equals(slot.endTime),
    );
    if (isDuplicate) return false;

    this._slots.push(slot);
    this._version = this._version.increment();
    return true;
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
  editSlot(
    slotId: SlotId,
    newStartTime: TimeOfDay,
    newEndTime: TimeOfDay,
  ): void {
    const slot = this.getSlotOrThrow(slotId);
    if (!slot.isAvailable()) {
      throw new SlotNotAvailableError(slotId.value);
    }
    const newTimeRange = TimeRange.create(newStartTime, newEndTime);
    const newDuration = Duration.create(newTimeRange.durationInMinutes());

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
   * @param treatmentDurationMinutes actual treatment duration (may exceed slot duration)
   */
  reserveSlot(
    slotId: SlotId,
    reservationId: ReservationId,
    treatmentDurationMinutes?: number,
  ): void {
    const slot = this.getSlotOrThrow(slotId);
    slot.reserve(reservationId, treatmentDurationMinutes);
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
  generateSlots(
    businessStartTime: TimeOfDay,
    businessEndTime: TimeOfDay,
    duration: Duration,
    bufferMinutes: number = 0,
  ): Slot[] {
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
      const isDuplicate = this._slots.some(
        (existing) =>
          existing.startTime.equals(slotStart) &&
          existing.endTime.equals(slotEnd),
      );

      if (!isDuplicate) {
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

      currentMinutes += duration.minutes + bufferMinutes;
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

}
