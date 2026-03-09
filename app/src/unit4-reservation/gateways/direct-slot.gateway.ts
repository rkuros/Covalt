import { Injectable } from '@nestjs/common';
import {
  SlotGateway,
  SlotListResult,
  SlotReserveResult,
  SlotReleaseResult,
} from '../domain/SlotGateway';
import { OwnerId } from '../domain/OwnerId';
import { SlotId } from '../domain/SlotId';
import { ReservationId } from '../domain/ReservationId';
import { SlotAvailabilityService } from '../../unit3-schedule/domain/SlotAvailabilityService';
import { SlotReservationService } from '../../unit3-schedule/domain/SlotReservationService';
import { OwnerId as ScheduleOwnerId } from '../../unit3-schedule/domain/OwnerId';
import { SlotDate } from '../../unit3-schedule/domain/SlotDate';
import { SlotId as ScheduleSlotId } from '../../unit3-schedule/domain/SlotId';
import { ReservationId as ScheduleReservationId } from '../../unit3-schedule/domain/ReservationId';

@Injectable()
export class DirectSlotGateway implements SlotGateway {
  constructor(
    private readonly availabilityService: SlotAvailabilityService,
    private readonly reservationService: SlotReservationService,
  ) {}

  async findAvailableSlots(
    ownerId: OwnerId,
    date: string,
  ): Promise<SlotListResult> {
    const result = await this.availabilityService.getAvailability(
      ScheduleOwnerId.create(ownerId.value),
      SlotDate.create(date),
    );
    return {
      date: result.date.value,
      isHoliday: result.isHoliday,
      slots: result.availableSlots.map((s) => ({
        slotId: s.slotId.value,
        startTime: s.startTime.toString(),
        endTime: s.endTime.toString(),
        durationMinutes: s.durationMinutes,
        status: s.status.toPact(),
      })),
    };
  }

  async reserveSlot(
    slotId: SlotId,
    reservationId: ReservationId,
    treatmentDurationMinutes?: number,
  ): Promise<SlotReserveResult> {
    const result = await this.reservationService.reserve(
      ScheduleSlotId.create(slotId.value),
      ScheduleReservationId.create(reservationId.value),
      treatmentDurationMinutes,
    );
    return {
      slotId: result.slotId,
      status: 'booked',
      reservationId: result.reservationId,
      date: result.date,
      startTime: result.startTime,
      endTime: result.endTime,
      durationMinutes: result.durationMinutes,
    };
  }

  async releaseSlot(
    slotId: SlotId,
    reservationId: ReservationId,
  ): Promise<SlotReleaseResult> {
    const result = await this.reservationService.release(
      ScheduleSlotId.create(slotId.value),
      ScheduleReservationId.create(reservationId.value),
    );
    return {
      slotId: result.slotId,
      status: 'available',
    };
  }
}
