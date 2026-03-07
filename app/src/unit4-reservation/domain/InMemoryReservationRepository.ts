/**
 * InMemoryReservationRepository - ReservationRepository のインメモリ実装
 *
 * テスト用・仮置き用の実装。
 */
import { Reservation } from './Reservation';
import { ReservationId } from './ReservationId';
import { CustomerId } from './CustomerId';
import { OwnerId } from './OwnerId';
import { ReservationStatus } from './ReservationStatus';
import { ReservationRepository } from './ReservationRepository';

export class InMemoryReservationRepository implements ReservationRepository {
  private readonly store = new Map<string, Reservation>();

  async save(reservation: Reservation): Promise<void> {
    this.store.set(reservation.reservationId.value, reservation);
  }

  async findById(reservationId: ReservationId): Promise<Reservation | null> {
    return this.store.get(reservationId.value) ?? null;
  }

  async findUpcomingByCustomerId(
    customerId: CustomerId,
    ownerId: OwnerId,
  ): Promise<Reservation[]> {
    const now = new Date();
    return this.allReservations()
      .filter(
        (r) =>
          r.customerId.equals(customerId) &&
          r.ownerId.equals(ownerId) &&
          r.status === ReservationStatus.Confirmed &&
          !r.dateTime.isPast(now),
      )
      .sort(
        (a, b) => a.dateTime.value.getTime() - b.dateTime.value.getTime(),
      );
  }

  async findPastByCustomerId(
    customerId: CustomerId,
    ownerId: OwnerId,
  ): Promise<Reservation[]> {
    const now = new Date();
    return this.allReservations()
      .filter(
        (r) =>
          r.customerId.equals(customerId) &&
          r.ownerId.equals(ownerId) &&
          (r.dateTime.isPast(now) ||
            r.status === ReservationStatus.Cancelled ||
            r.status === ReservationStatus.Completed),
      )
      .sort(
        (a, b) => b.dateTime.value.getTime() - a.dateTime.value.getTime(),
      );
  }

  async findByOwnerIdAndDateRange(
    ownerId: OwnerId,
    startDate: Date,
    endDate: Date,
  ): Promise<Reservation[]> {
    return this.allReservations()
      .filter(
        (r) =>
          r.ownerId.equals(ownerId) &&
          r.dateTime.value.getTime() >= startDate.getTime() &&
          r.dateTime.value.getTime() <= endDate.getTime(),
      )
      .sort(
        (a, b) => a.dateTime.value.getTime() - b.dateTime.value.getTime(),
      );
  }

  async findByOwnerIdAndStatus(
    ownerId: OwnerId,
    status: ReservationStatus,
  ): Promise<Reservation[]> {
    return this.allReservations()
      .filter(
        (r) => r.ownerId.equals(ownerId) && r.status === status,
      )
      .sort(
        (a, b) => a.dateTime.value.getTime() - b.dateTime.value.getTime(),
      );
  }

  async findByOwnerIdAndDateRangeAndStatus(
    ownerId: OwnerId,
    startDate: Date,
    endDate: Date,
    status: ReservationStatus,
  ): Promise<Reservation[]> {
    return this.allReservations()
      .filter(
        (r) =>
          r.ownerId.equals(ownerId) &&
          r.status === status &&
          r.dateTime.value.getTime() >= startDate.getTime() &&
          r.dateTime.value.getTime() <= endDate.getTime(),
      )
      .sort(
        (a, b) => a.dateTime.value.getTime() - b.dateTime.value.getTime(),
      );
  }

  /** テスト用: ストアをクリアする。 */
  clear(): void {
    this.store.clear();
  }

  private allReservations(): Reservation[] {
    return Array.from(this.store.values());
  }
}
