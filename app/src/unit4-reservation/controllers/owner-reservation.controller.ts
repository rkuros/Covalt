import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ReservationCommandService } from '../domain/ReservationCommandService';
import type { ReservationRepository } from '../domain/ReservationRepository';
import { ActorType } from '../domain/ActorType';
import { OwnerId } from '../domain/OwnerId';
import { ReservationId } from '../domain/ReservationId';
import { Reservation } from '../domain/Reservation';

// --- Request DTOs ---

interface CreateOwnerReservationBody {
  customerId?: string;
  newCustomerName?: string;
  slotId: string;
  dateTime: string;
  durationMinutes: number;
}

interface ModifyReservationBody {
  newSlotId: string;
  newDateTime: string;
  newDurationMinutes: number;
}

// --- Authenticated request type ---

interface AuthenticatedRequest {
  user: {
    ownerId: string;
    email: string;
    role: string;
  };
}

// --- Response helpers ---

function toReservationResponse(r: Reservation) {
  return {
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

@Controller('api/owner/reservations')
@UseGuards(AuthGuard)
export class OwnerReservationController {
  private readonly logger = new Logger(OwnerReservationController.name);

  constructor(
    private readonly commandService: ReservationCommandService,
    @Inject('ReservationRepository')
    private readonly reservationRepository: ReservationRepository,
  ) {}

  /**
   * POST /api/owner/reservations
   * オーナー経由での予約作成
   */
  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateOwnerReservationBody,
  ) {
    if (!body.slotId) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'slotId is required',
      });
    }

    if (!body.customerId && !body.newCustomerName) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Either customerId or newCustomerName is required',
      });
    }

    try {
      const reservation = await this.commandService.createReservation({
        ownerId: req.user.ownerId,
        slotId: body.slotId,
        dateTime: body.dateTime,
        durationMinutes: body.durationMinutes,
        customerId: body.customerId,
        newCustomerName: body.newCustomerName,
        createdBy: ActorType.Owner,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * GET /api/owner/reservations/:id
   * 予約詳細 (US-O02)
   */
  @Get(':id')
  async getDetail(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const reservationId = ReservationId.create(id);
    const reservation = await this.reservationRepository.findById(reservationId);

    if (!reservation || reservation.ownerId.value !== ownerId.value) {
      throw new NotFoundException({
        error: 'NOT_FOUND',
        message: '予約が見つかりません',
      });
    }

    return toReservationResponse(reservation);
  }

  /**
   * GET /api/owner/reservations?startDate=xxx&endDate=yyy
   * 期間指定予約一覧
   */
  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'startDate and endDate query parameters are required',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'startDate and endDate must be valid ISO 8601 dates',
      });
    }

    try {
      const ownerId = OwnerId.create(req.user.ownerId);
      const reservations =
        await this.reservationRepository.findByOwnerIdAndDateRange(
          ownerId,
          start,
          end,
        );

      return {
        reservations: reservations.map(toReservationResponse),
        total: reservations.length,
      };
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * PUT /api/owner/reservations/:id/modify
   * 予約変更
   */
  @Put(':id/modify')
  async modify(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: ModifyReservationBody,
  ) {
    await this.verifyOwnership(req.user.ownerId, id);
    if (!body.newSlotId || !body.newDateTime || !body.newDurationMinutes) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'newSlotId, newDateTime, and newDurationMinutes are required',
      });
    }

    try {
      const reservation = await this.commandService.modifyReservation({
        reservationId: id,
        newSlotId: body.newSlotId,
        newDateTime: body.newDateTime,
        newDurationMinutes: body.newDurationMinutes,
        modifiedBy: ActorType.Owner,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * PUT /api/owner/reservations/:id/cancel
   * 予約キャンセル
   */
  @Put(':id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    await this.verifyOwnership(req.user.ownerId, id);
    try {
      const reservation = await this.commandService.cancelReservation({
        reservationId: id,
        cancelledBy: ActorType.Owner,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * PUT /api/owner/reservations/:id/complete
   * 予約完了
   */
  @Put(':id/complete')
  async complete(@Req() req: any, @Param('id') id: string) {
    await this.verifyOwnership(req.user.ownerId, id);
    try {
      const reservation = await this.commandService.completeReservation({
        reservationId: id,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  // --- Private helpers ---

  private async verifyOwnership(ownerId: string, reservationId: string): Promise<void> {
    const reservation = await this.reservationRepository.findById(
      ReservationId.create(reservationId),
    );
    if (!reservation) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: '予約が見つかりません' });
    }
    if (reservation.ownerId.value !== ownerId) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'この予約へのアクセス権がありません' });
    }
  }

  private handleDomainError(error: unknown): never {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Domain error: ${message}`);

    if (message.includes('not found')) {
      throw new NotFoundException({
        error: 'NOT_FOUND',
        message,
      });
    }
    if (
      message.includes('SLOT_ALREADY_BOOKED') ||
      message.includes('Cannot')
    ) {
      throw new BadRequestException({
        error: 'BUSINESS_RULE_VIOLATION',
        message,
      });
    }
    throw new InternalServerErrorException({
      error: 'INTERNAL_ERROR',
      message,
    });
  }
}
