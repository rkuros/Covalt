import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reservation } from '../domain/Reservation';

/**
 * Convert a Reservation domain object to a JSON response.
 * When includeHistories is true, the histories array is included (for owner-facing endpoints).
 */
export function toReservationResponse(
  r: Reservation,
  options?: { includeHistories?: boolean },
) {
  const base = {
    reservationId: r.reservationId.value,
    ownerId: r.ownerId.value,
    customerId: r.customerId.value,
    slotId: r.slotId.value,
    dateTime: r.dateTime.toISOString(),
    durationMinutes: r.durationMinutes.value,
    status: r.status,
    customerName: r.customerName.value,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };

  if (options?.includeHistories) {
    return {
      ...base,
      histories: r.histories.map((h) => ({
        historyId: h.historyId.value,
        changeType: h.changeType,
        previousDateTime: h.previousDateTime?.toISOString() ?? null,
        newDateTime: h.newDateTime?.toISOString() ?? null,
        previousSlotId: h.previousSlotId?.value ?? null,
        newSlotId: h.newSlotId?.value ?? null,
        changedBy: h.changedBy,
        changedAt: h.changedAt.toISOString(),
      })),
    };
  }

  return base;
}

/**
 * Map domain errors to appropriate HTTP exceptions.
 */
export function handleDomainError(error: unknown, logger: Logger): never {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const code = (error as any)?.code as string | undefined;
  logger.error(`Domain error: ${message}`);

  if (message.includes('not found') || code === 'SLOT_NOT_FOUND') {
    throw new NotFoundException({
      error: 'NOT_FOUND',
      message,
    });
  }
  if (
    code === 'SLOT_ALREADY_BOOKED' ||
    message.includes('SLOT_ALREADY_BOOKED') ||
    message.includes('already booked') ||
    message.includes('Cannot')
  ) {
    throw new ConflictException({
      error: 'CONFLICT',
      message,
    });
  }
  if (
    message.includes('must be') ||
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('Invalid') ||
    code === 'VALIDATION_ERROR'
  ) {
    throw new BadRequestException({
      error: 'VALIDATION_ERROR',
      message,
    });
  }
  throw new InternalServerErrorException({
    error: 'INTERNAL_ERROR',
    message,
  });
}
