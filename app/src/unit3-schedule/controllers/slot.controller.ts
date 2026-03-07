import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  HttpCode,
  UseGuards,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { SlotAvailabilityService } from '../domain/SlotAvailabilityService';
import { SlotReservationService } from '../domain/SlotReservationService';
import { OwnerId } from '../domain/OwnerId';
import { SlotDate } from '../domain/SlotDate';
import { SlotId } from '../domain/SlotId';
import { ReservationId } from '../domain/ReservationId';
import { SlotAlreadyBookedError, SlotNotFoundError } from '../domain/DomainErrors';

@Controller('api/slots')
@UseGuards(AuthGuard)
export class SlotController {
  constructor(
    private readonly slotAvailabilityService: SlotAvailabilityService,
    private readonly slotReservationService: SlotReservationService,
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
    const ownerId = OwnerId.create(ownerIdParam);
    const date = SlotDate.create(dateParam);

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
