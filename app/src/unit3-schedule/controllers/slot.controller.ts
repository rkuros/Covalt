import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  HttpCode,
  Inject,
  UseGuards,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { SlotAvailabilityService } from '../domain/SlotAvailabilityService';
import { SlotReservationService } from '../domain/SlotReservationService';
import type { DailySlotListRepository } from '../domain/DailySlotListRepository';
import { OwnerId } from '../domain/OwnerId';
import { SlotDate } from '../domain/SlotDate';
import { SlotId } from '../domain/SlotId';
import { ReservationId } from '../domain/ReservationId';
import { SlotAlreadyBookedError, SlotNotFoundError } from '../domain/DomainErrors';
import { DAILY_SLOT_LIST_REPOSITORY } from '../di-tokens';

@Controller('api/slots')
@UseGuards(AuthGuard)
export class SlotController {
  constructor(
    private readonly slotAvailabilityService: SlotAvailabilityService,
    private readonly slotReservationService: SlotReservationService,
    @Inject(DAILY_SLOT_LIST_REPOSITORY)
    private readonly dailySlotListRepo: DailySlotListRepository,
  ) {}

  /**
   * GET /api/slots/available?ownerId=xxx&date=yyyy-mm-dd
   * Returns available slots for the given owner and date.
   */
  @Get('available')
  async getAvailableSlots(
    @Query('ownerId') ownerIdParam: string,
    @Query('date') dateParam: string,
  ) {
    if (!ownerIdParam || !dateParam) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'ownerId and date query parameters are required',
      });
    }
    let ownerId: OwnerId;
    let date: SlotDate;
    try {
      ownerId = OwnerId.create(ownerIdParam);
      date = SlotDate.create(dateParam);
    } catch (e) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: e instanceof Error ? e.message : 'Invalid parameters',
      });
    }

    const result = await this.slotAvailabilityService.getAvailability(
      ownerId,
      date,
    );

    return {
      date: result.date.value,
      isHoliday: result.isHoliday,
      slots: result.availableSlots.map((slot) => ({
        slotId: slot.slotId.value,
        startTime: slot.startTime.toString(),
        endTime: slot.endTime.toString(),
        durationMinutes: slot.durationMinutes,
        status: slot.status.toPact(),
      })),
    };
  }

  /**
   * GET /api/slots/summary?ownerId=xxx&startDate=yyyy-mm-dd&endDate=yyyy-mm-dd
   * Returns slot summary (available/booked counts) per day for the date range.
   */
  @Get('summary')
  async getSlotSummary(
    @Query('ownerId') ownerIdParam: string,
    @Query('startDate') startDateParam: string,
    @Query('endDate') endDateParam: string,
  ) {
    if (!ownerIdParam || !startDateParam || !endDateParam) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'ownerId, startDate, and endDate query parameters are required',
      });
    }
    let ownerId: OwnerId;
    let startDate: SlotDate;
    let endDate: SlotDate;
    try {
      ownerId = OwnerId.create(ownerIdParam);
      startDate = SlotDate.create(startDateParam);
      endDate = SlotDate.create(endDateParam);
    } catch (e) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: e instanceof Error ? e.message : 'Invalid parameters',
      });
    }

    const dailySlotLists = await this.dailySlotListRepo.findAllByOwnerIdAndDateRange(
      ownerId,
      startDate,
      endDate,
    );

    const summary: Record<string, {
      totalSlots: number;
      availableCount: number;
      bookedCount: number;
      availableSlots: { startTime: string; endTime: string }[];
    }> = {};
    for (const dsl of dailySlotLists) {
      const slots = dsl.slots;
      summary[dsl.date.value] = {
        totalSlots: slots.length,
        availableCount: slots.filter((s) => s.isAvailable()).length,
        bookedCount: slots.filter((s) => s.isBooked()).length,
        availableSlots: slots
          .filter((s) => s.isAvailable())
          .map((s) => ({ startTime: s.startTime.toString(), endTime: s.endTime.toString() })),
      };
    }

    return { summary };
  }

  /**
   * PUT /api/slots/:slotId/reserve
   * Reserves a slot for a reservation.
   */
  @Put(':slotId/reserve')
  @HttpCode(200)
  async reserveSlot(
    @Param('slotId') slotIdParam: string,
    @Body() body: { reservationId: string },
  ) {
    try {
      const slotId = SlotId.create(slotIdParam);
      const reservationId = ReservationId.create(body.reservationId);

      const result = await this.slotReservationService.reserve(
        slotId,
        reservationId,
      );

      return {
        slotId: result.slotId,
        status: result.status,
        reservationId: result.reservationId,
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        durationMinutes: result.durationMinutes,
      };
    } catch (error) {
      if (error instanceof SlotAlreadyBookedError) {
        throw new ConflictException({
          error: 'SLOT_ALREADY_BOOKED',
          message: '指定されたスロットは既に予約済みです',
        });
      }
      if (error instanceof SlotNotFoundError) {
        throw new NotFoundException({
          error: 'SLOT_NOT_FOUND',
          message: '指定されたスロットが見つかりません',
        });
      }
      throw error;
    }
  }

  /**
   * PUT /api/slots/:slotId/release
   * Releases a slot from a reservation.
   */
  @Put(':slotId/release')
  @HttpCode(200)
  async releaseSlot(
    @Param('slotId') slotIdParam: string,
    @Body() body: { reservationId: string },
  ) {
    try {
      const slotId = SlotId.create(slotIdParam);
      const reservationId = ReservationId.create(body.reservationId);

      const result = await this.slotReservationService.release(
        slotId,
        reservationId,
      );

      return {
        slotId: result.slotId,
        status: result.status,
      };
    } catch (error) {
      if (error instanceof SlotNotFoundError) {
        throw new NotFoundException({
          error: 'SLOT_NOT_FOUND',
          message: '指定されたスロットが見つかりません',
        });
      }
      throw error;
    }
  }
}
