import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ReservationCommandService } from '../domain/ReservationCommandService';
import type { ReservationRepository } from '../domain/ReservationRepository';
import type { LiffGateway } from '../domain/LiffGateway';
import type { CustomerGateway } from '../domain/CustomerGateway';
import { ActorType } from '../domain/ActorType';
import { CustomerId } from '../domain/CustomerId';
import { OwnerId } from '../domain/OwnerId';
import { LineUserId } from '../domain/LineUserId';
import { Reservation } from '../domain/Reservation';

// --- Request DTOs ---

interface CreateReservationBody {
  ownerId: string;
  slotId: string;
  dateTime: string;
  durationMinutes: number;
}

interface ModifyReservationBody {
  newSlotId: string;
  newDateTime: string;
  newDurationMinutes: number;
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
  };
}

@Controller('api/reservations')
export class CustomerReservationController {
  private readonly logger = new Logger(CustomerReservationController.name);

  constructor(
    private readonly commandService: ReservationCommandService,
    @Inject('ReservationRepository')
    private readonly reservationRepository: ReservationRepository,
    @Inject('LiffGateway')
    private readonly liffGateway: LiffGateway,
    @Inject('CustomerGateway')
    private readonly customerGateway: CustomerGateway,
  ) {}

  /**
   * POST /api/reservations
   * LIFF 経由での予約作成
   */
  @Post()
  async create(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
    @Body() body: CreateReservationBody,
  ) {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!body.ownerId || !body.slotId) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'ownerId and slotId are required',
      });
    }

    try {
      const reservation = await this.commandService.createReservation({
        ownerId: body.ownerId,
        slotId: body.slotId,
        dateTime: body.dateTime,
        durationMinutes: body.durationMinutes,
        lineUserId: liffResult.lineUserId,
        createdBy: ActorType.Customer,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * GET /api/reservations/upcoming
   * 顧客の未来予約一覧
   */
  @Get('upcoming')
  async getUpcoming(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!ownerIdHeader) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'x-owner-id header is required',
      });
    }

    try {
      const ownerId = OwnerId.create(ownerIdHeader);
      const lineUserId = LineUserId.create(liffResult.lineUserId);
      if (!lineUserId) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Invalid lineUserId',
        });
      }

      const customer = await this.customerGateway.findByLineUserId(
        ownerId,
        lineUserId,
      );
      if (!customer) {
        return { reservations: [] };
      }

      const customerId = CustomerId.create(customer.customerId);
      const reservations =
        await this.reservationRepository.findUpcomingByCustomerId(
          customerId,
          ownerId,
        );

      return {
        reservations: reservations.map(toReservationResponse),
      };
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * GET /api/reservations/history
   * 顧客の過去予約一覧
   */
  @Get('history')
  async getHistory(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!ownerIdHeader) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'x-owner-id header is required',
      });
    }

    try {
      const ownerId = OwnerId.create(ownerIdHeader);
      const lineUserId = LineUserId.create(liffResult.lineUserId);
      if (!lineUserId) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Invalid lineUserId',
        });
      }

      const customer = await this.customerGateway.findByLineUserId(
        ownerId,
        lineUserId,
      );
      if (!customer) {
        return { reservations: [] };
      }

      const customerId = CustomerId.create(customer.customerId);
      const reservations =
        await this.reservationRepository.findPastByCustomerId(
          customerId,
          ownerId,
        );

      return {
        reservations: reservations.map(toReservationResponse),
      };
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * PUT /api/reservations/:id/modify
   * 予約変更
   */
  @Put(':id/modify')
  async modify(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: ModifyReservationBody,
  ) {
    await this.verifyLiffToken(authHeader, mockAuthHeader);

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
        modifiedBy: ActorType.Customer,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  /**
   * PUT /api/reservations/:id/cancel
   * 予約キャンセル
   */
  @Put(':id/cancel')
  async cancel(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
    @Param('id') id: string,
  ) {
    await this.verifyLiffToken(authHeader, mockAuthHeader);

    try {
      const reservation = await this.commandService.cancelReservation({
        reservationId: id,
        cancelledBy: ActorType.Customer,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      this.handleDomainError(error);
    }
  }

  // --- Private helpers ---

  private async verifyLiffToken(
    authHeader: string | undefined,
    mockAuthHeader?: string,
  ): Promise<{ lineUserId: string; displayName: string }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'LIFF access token is required',
      });
    }

    // Mock mode: skip LIFF verification and return a mock identity
    if (mockAuthHeader === 'true') {
      return { lineUserId: 'U00000000000000000000000000000000', displayName: 'テストユーザー' };
    }

    const token = authHeader.slice(7);
    try {
      return await this.liffGateway.verifyLiffToken(token);
    } catch {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Invalid LIFF access token',
      });
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
