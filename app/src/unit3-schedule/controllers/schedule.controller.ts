import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Inject,
  HttpCode,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import type { BusinessHourRepository } from '../domain/BusinessHourRepository';
import type { ClosedDayRepository } from '../domain/ClosedDayRepository';
import { SlotGenerationService } from '../domain/SlotGenerationService';
import { BusinessHour } from '../domain/BusinessHour';
import { BusinessHourId } from '../domain/BusinessHourId';
import { ClosedDay } from '../domain/ClosedDay';
import { ClosedDayId } from '../domain/ClosedDayId';
import { OwnerId } from '../domain/OwnerId';
import { DayOfWeek, DayOfWeekEnum } from '../domain/DayOfWeek';
import { TimeOfDay } from '../domain/TimeOfDay';
import { SlotDate } from '../domain/SlotDate';
import { Duration } from '../domain/Duration';
import {
  BUSINESS_HOUR_REPOSITORY,
  CLOSED_DAY_REPOSITORY,
} from '../di-tokens';

interface AuthenticatedRequest {
  user: { ownerId: string; email: string; role: string };
}

@Controller('api/schedule')
@UseGuards(AuthGuard)
export class ScheduleController {
  constructor(
    @Inject(BUSINESS_HOUR_REPOSITORY)
    private readonly businessHourRepo: BusinessHourRepository,
    @Inject(CLOSED_DAY_REPOSITORY)
    private readonly closedDayRepo: ClosedDayRepository,
    private readonly slotGenerationService: SlotGenerationService,
  ) {}

  /**
   * GET /api/schedule/business-hours
   * Returns all business hours for the authenticated owner.
   */
  @Get('business-hours')
  async getBusinessHours(@Req() req: AuthenticatedRequest) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const businessHours = await this.businessHourRepo.findAllByOwnerId(ownerId);

    return {
      businessHours: businessHours.map((bh) => ({
        businessHourId: bh.businessHourId.value,
        dayOfWeek: bh.dayOfWeek.value,
        startTime: bh.startTime?.toString() ?? null,
        endTime: bh.endTime?.toString() ?? null,
        isBusinessDay: bh.isBusinessDay,
      })),
    };
  }

  /**
   * PUT /api/schedule/business-hours/:dayOfWeek
   * Sets business hours for a specific day of the week.
   */
  @Put('business-hours/:dayOfWeek')
  @HttpCode(200)
  async setBusinessHour(
    @Req() req: AuthenticatedRequest,
    @Param('dayOfWeek') dayOfWeekParam: string,
    @Body()
    body: {
      startTime?: string;
      endTime?: string;
      isBusinessDay: boolean;
    },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const dayOfWeekValue = dayOfWeekParam.toUpperCase() as DayOfWeekEnum;

    if (!Object.values(DayOfWeekEnum).includes(dayOfWeekValue)) {
      throw new BadRequestException({
        error: 'INVALID_DAY_OF_WEEK',
        message: `無効な曜日です: ${dayOfWeekParam}`,
      });
    }

    const dayOfWeek = DayOfWeek.create(dayOfWeekValue);

    // Find existing or create new
    let businessHour = await this.businessHourRepo.findByOwnerIdAndDayOfWeek(
      ownerId,
      dayOfWeek,
    );

    if (businessHour) {
      if (body.isBusinessDay) {
        if (!body.startTime || !body.endTime) {
          throw new BadRequestException({
            error: 'MISSING_TIME',
            message: '営業日の場合、開始時間と終了時間が必要です',
          });
        }
        const startTime = TimeOfDay.fromString(body.startTime);
        const endTime = TimeOfDay.fromString(body.endTime);
        businessHour.setAsBusinessDay(startTime, endTime);
      } else {
        businessHour.setAsClosedDay();
      }
    } else {
      const startTime = body.startTime
        ? TimeOfDay.fromString(body.startTime)
        : TimeOfDay.create(9, 0);
      const endTime = body.endTime
        ? TimeOfDay.fromString(body.endTime)
        : TimeOfDay.create(18, 0);

      businessHour = BusinessHour.create({
        businessHourId: BusinessHourId.generate(),
        ownerId,
        dayOfWeek,
        startTime,
        endTime,
        isBusinessDay: body.isBusinessDay,
      });
    }

    await this.businessHourRepo.save(businessHour);

    return {
      businessHourId: businessHour.businessHourId.value,
      dayOfWeek: businessHour.dayOfWeek.value,
      startTime: businessHour.startTime?.toString() ?? null,
      endTime: businessHour.endTime?.toString() ?? null,
      isBusinessDay: businessHour.isBusinessDay,
    };
  }

  /**
   * GET /api/schedule/closed-days
   * Returns all closed days for the authenticated owner.
   */
  @Get('closed-days')
  async getClosedDays(@Req() req: AuthenticatedRequest) {
    const ownerId = OwnerId.create(req.user.ownerId);
    // Fetch a wide range (current year +/- 1 year)
    const now = new Date();
    const startDate = SlotDate.create(
      `${now.getFullYear() - 1}-01-01`,
    );
    const endDate = SlotDate.create(
      `${now.getFullYear() + 1}-12-31`,
    );
    const closedDays = await this.closedDayRepo.findAllByOwnerIdAndDateRange(
      ownerId,
      startDate,
      endDate,
    );

    return {
      closedDays: closedDays.map((cd) => ({
        closedDayId: cd.closedDayId.value,
        date: cd.date.value,
        reason: cd.reason,
      })),
    };
  }

  /**
   * POST /api/schedule/closed-days
   * Creates a closed day for the authenticated owner.
   */
  @Post('closed-days')
  @HttpCode(201)
  async createClosedDay(
    @Req() req: AuthenticatedRequest,
    @Body() body: { date: string; reason?: string },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const date = SlotDate.create(body.date);

    // Check if already exists
    const existing = await this.closedDayRepo.findByOwnerIdAndDate(
      ownerId,
      date,
    );
    if (existing) {
      return {
        closedDayId: existing.closedDayId.value,
        date: existing.date.value,
        reason: existing.reason,
      };
    }

    const closedDay = ClosedDay.create({
      closedDayId: ClosedDayId.generate(),
      ownerId,
      date,
      reason: body.reason ?? null,
    });

    await this.closedDayRepo.save(closedDay);

    return {
      closedDayId: closedDay.closedDayId.value,
      date: closedDay.date.value,
      reason: closedDay.reason,
    };
  }

  /**
   * DELETE /api/schedule/closed-days/:closedDayId
   * Deletes a closed day by ID.
   */
  @Delete('closed-days/:closedDayId')
  @HttpCode(200)
  async deleteClosedDay(
    @Req() req: AuthenticatedRequest,
    @Param('closedDayId') closedDayIdParam: string,
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    // We need to find the closed day to verify ownership.
    // Since the repository interface doesn't have findById, we search by date range.
    const startDate = SlotDate.create('2000-01-01');
    const endDate = SlotDate.create('2099-12-31');
    const closedDays = await this.closedDayRepo.findAllByOwnerIdAndDateRange(
      ownerId,
      startDate,
      endDate,
    );

    const closedDay = closedDays.find(
      (cd) => cd.closedDayId.value === closedDayIdParam,
    );
    if (!closedDay) {
      throw new NotFoundException({
        error: 'CLOSED_DAY_NOT_FOUND',
        message: '指定された休業日が見つかりません',
      });
    }

    await this.closedDayRepo.delete(closedDay);

    return { message: '休業日を削除しました' };
  }

  /**
   * POST /api/schedule/slots/generate
   * Generates slots for a specific date based on business hours.
   */
  @Post('slots/generate')
  @HttpCode(200)
  async generateSlots(
    @Req() req: AuthenticatedRequest,
    @Body() body: { date: string; durationMinutes: number },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const date = SlotDate.create(body.date);
    const duration = Duration.create(body.durationMinutes);

    const addedSlots = await this.slotGenerationService.generate(
      ownerId,
      date,
      duration,
    );

    return {
      date: date.value,
      generatedCount: addedSlots.length,
      slots: addedSlots.map((slot) => ({
        slotId: slot.slotId.value,
        startTime: slot.startTime.toString(),
        endTime: slot.endTime.toString(),
        durationMinutes: slot.durationMinutes,
        status: slot.status.toPact(),
      })),
    };
  }
}
