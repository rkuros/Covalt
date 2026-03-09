/**
 * Domain-specific errors for Unit 3.
 */

export class SlotAlreadyBookedError extends Error {
  readonly code = 'SLOT_ALREADY_BOOKED' as const;

  constructor(slotId: string) {
    super(`Slot ${slotId} is already booked`);
    this.name = 'SlotAlreadyBookedError';
  }
}

export class SlotOverlapError extends Error {
  readonly code = 'SLOT_OVERLAP' as const;

  constructor(message?: string) {
    super(message ?? 'Slot time range overlaps with an existing slot');
    this.name = 'SlotOverlapError';
  }
}

export class SlotNotFoundError extends Error {
  readonly code = 'SLOT_NOT_FOUND' as const;

  constructor(slotId: string) {
    super(`Slot ${slotId} not found`);
    this.name = 'SlotNotFoundError';
  }
}

export class ReservationIdMismatchError extends Error {
  readonly code = 'RESERVATION_ID_MISMATCH' as const;

  constructor(slotId: string) {
    super(`ReservationId does not match for slot ${slotId}`);
    this.name = 'ReservationIdMismatchError';
  }
}

export class OptimisticLockError extends Error {
  readonly code = 'OPTIMISTIC_LOCK' as const;

  constructor() {
    super(
      'Optimistic lock conflict: the resource was modified by another transaction',
    );
    this.name = 'OptimisticLockError';
  }
}

export class SlotNotAvailableError extends Error {
  readonly code = 'SLOT_NOT_AVAILABLE' as const;

  constructor(slotId: string) {
    super(`Slot ${slotId} is not in available status`);
    this.name = 'SlotNotAvailableError';
  }
}

export class SlotNotBookedError extends Error {
  readonly code = 'SLOT_NOT_BOOKED' as const;

  constructor(slotId: string) {
    super(`Slot ${slotId} is not in booked status`);
    this.name = 'SlotNotBookedError';
  }
}
