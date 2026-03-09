import { SlotId } from './SlotId';
import { ReservationId } from './ReservationId';
import { Slot } from './Slot';
import { DailySlotListRepository } from './DailySlotListRepository';
import { SlotNotFoundError } from './DomainErrors';

/**
 * Reserve result matching PACT contract response.
 */
export interface ReserveResult {
  readonly slotId: string;
  readonly status: string;
  readonly reservationId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly durationMinutes: number;
}

/**
 * Release result matching PACT contract response.
 */
export interface ReleaseResult {
  readonly slotId: string;
  readonly status: string;
}

/**
 * SlotReservationService - Domain Service
 *
 * Handles slot reservation (reserve) and cancellation (release).
 * Coordinates DailySlotList aggregate operations with optimistic locking.
 */
export class SlotReservationService {
  constructor(private readonly dailySlotListRepo: DailySlotListRepository) {}

  /**
   * Reserve a slot for the given reservation.
   *
   * Flow:
   * 1. Find the DailySlotList containing the slot.
   * 2. Reserve the slot via aggregate root (validates available status).
   * 3. Save with optimistic lock verification.
   *
   * @throws SlotNotFoundError if slotId is not found.
   * @throws SlotAlreadyBookedError if the slot is already booked.
   * @throws OptimisticLockError on version conflict.
   */
  async reserve(
    slotId: SlotId,
    reservationId: ReservationId,
    treatmentDurationMinutes?: number,
  ): Promise<ReserveResult> {
    const found = await this.dailySlotListRepo.findSlotById(slotId);
    if (!found) {
      throw new SlotNotFoundError(slotId.value);
    }

    const { dailySlotList } = found;
    dailySlotList.reserveSlot(slotId, reservationId, treatmentDurationMinutes);
    await this.dailySlotListRepo.save(dailySlotList);

    // Get the updated slot after reservation (has treatmentDurationMinutes set)
    const updatedSlot = dailySlotList.findSlotById(slotId)!;

    return {
      slotId: slotId.value,
      status: 'booked',
      reservationId: reservationId.value,
      date: dailySlotList.date.value,
      startTime: updatedSlot.startTime.toString(),
      endTime: updatedSlot.endTime.toString(),
      durationMinutes: updatedSlot.effectiveTreatmentMinutes,
    };
  }

  /**
   * Release a slot from a reservation.
   *
   * Flow:
   * 1. Find the DailySlotList containing the slot.
   * 2. Release the slot via aggregate root (validates booked status and reservationId).
   * 3. Save with optimistic lock verification.
   *
   * @throws SlotNotFoundError if slotId is not found.
   * @throws SlotNotBookedError if the slot is not booked.
   * @throws ReservationIdMismatchError if the reservationId does not match.
   * @throws OptimisticLockError on version conflict.
   */
  async release(
    slotId: SlotId,
    reservationId: ReservationId,
  ): Promise<ReleaseResult> {
    const found = await this.dailySlotListRepo.findSlotById(slotId);
    if (!found) {
      throw new SlotNotFoundError(slotId.value);
    }

    const { dailySlotList } = found;
    dailySlotList.releaseSlot(slotId, reservationId);
    await this.dailySlotListRepo.save(dailySlotList);

    return {
      slotId: slotId.value,
      status: 'available',
    };
  }
}
