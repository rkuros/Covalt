import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Inject,
  HttpCode,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { BusinessHourRepository } from '../domain/BusinessHourRepository';
import type { ClosedDayRepository } from '../domain/ClosedDayRepository';
import type { DailySlotListRepository } from '../domain/DailySlotListRepository';
import { SlotGenerationService } from '../domain/SlotGenerationService';
import { BusinessHour } from '../domain/BusinessHour';
import { BusinessHourId } from '../domain/BusinessHourId';
import { ClosedDay } from '../domain/ClosedDay';
import { ClosedDayId } from '../domain/ClosedDayId';
import { DailySlotList } from '../domain/DailySlotList';
import { Slot } from '../domain/Slot';
import { SlotId } from '../domain/SlotId';
import { SlotStatus } from '../domain/SlotStatus';
import { OwnerId } from '../domain/OwnerId';
import { DayOfWeek, DayOfWeekEnum } from '../domain/DayOfWeek';
import { TimeOfDay } from '../domain/TimeOfDay';
import { TimeRange } from '../domain/TimeRange';
import { SlotDate } from '../domain/SlotDate';
import { Duration } from '../domain/Duration';
import { SlotOverlapError, SlotNotFoundError, SlotNotAvailableError } from '../domain/DomainErrors';
import { SlotTemplate } from '../domain/SlotTemplate';
import { SlotTemplateId } from '../domain/SlotTemplateId';
import type { SlotTemplateRepository } from '../domain/SlotTemplateRepository';
import {
  BUSINESS_HOUR_REPOSITORY,
  CLOSED_DAY_REPOSITORY,
  DAILY_SLOT_LIST_REPOSITORY,
  SLOT_TEMPLATE_REPOSITORY,
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
    @Inject(DAILY_SLOT_LIST_REPOSITORY)
    private readonly dailySlotListRepo: DailySlotListRepository,
    @Inject(SLOT_TEMPLATE_REPOSITORY)
    private readonly slotTemplateRepo: SlotTemplateRepository,
    private readonly slotGenerationService: SlotGenerationService,
    private readonly prisma: PrismaService,
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
   * GET /api/schedule/slots/summary?startDate=yyyy-mm-dd&endDate=yyyy-mm-dd
   * Returns slot counts per day for the date range.
   */
  @Get('slots/summary')
  async getSlotSummary(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDateParam: string,
    @Query('endDate') endDateParam: string,
  ) {
    if (!startDateParam || !endDateParam) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'startDate and endDate query parameters are required',
      });
    }
    let startDate: SlotDate;
    let endDate: SlotDate;
    try {
      startDate = SlotDate.create(startDateParam);
      endDate = SlotDate.create(endDateParam);
    } catch (e) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: e instanceof Error ? e.message : 'Invalid date format',
      });
    }
    const ownerId = OwnerId.create(req.user.ownerId);

    const dailySlotLists = await this.dailySlotListRepo.findAllByOwnerIdAndDateRange(
      ownerId,
      startDate,
      endDate,
    );

    const days: Record<string, {
      total: number;
      available: number;
      booked: number;
      availableSlots: { startTime: string; endTime: string }[];
    }> = {};
    for (const dsl of dailySlotLists) {
      const slots = dsl.slots;
      days[dsl.date.value] = {
        total: slots.length,
        available: slots.filter((s) => s.isAvailable()).length,
        booked: slots.filter((s) => s.isBooked()).length,
        availableSlots: slots
          .filter((s) => s.isAvailable())
          .map((s) => ({ startTime: s.startTime.toString(), endTime: s.endTime.toString() })),
      };
    }

    return { days };
  }

  /**
   * GET /api/schedule/slots/date/:date
   * Returns ALL slots (available + booked) for the owner on a specific date.
   */
  @Get('slots/date/:date')
  async getAllSlotsForDate(
    @Req() req: AuthenticatedRequest,
    @Param('date') dateParam: string,
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const date = SlotDate.create(dateParam);

    const dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(ownerId, date);
    if (!dailySlotList) {
      return { date: date.value, slots: [] };
    }

    return {
      date: date.value,
      slots: dailySlotList.slots.map((slot) => ({
        slotId: slot.slotId.value,
        startTime: slot.startTime.toString(),
        endTime: slot.endTime.toString(),
        durationMinutes: slot.durationMinutes,
        status: slot.status.toPact(),
        reservationId: slot.reservationId?.value ?? null,
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
    @Body() body: { date: string; durationMinutes: number; bufferMinutes?: number },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const date = SlotDate.create(body.date);
    const duration = Duration.create(body.durationMinutes);
    const bufferMinutes = body.bufferMinutes ?? 0;

    if (bufferMinutes < 0 || bufferMinutes > 120) {
      throw new BadRequestException({
        error: 'INVALID_BUFFER',
        message: 'バッファ時間は0〜120分の範囲で指定してください',
      });
    }

    const addedSlots = await this.slotGenerationService.generate(
      ownerId,
      date,
      duration,
      bufferMinutes,
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

  /**
   * POST /api/schedule/slots
   * Creates a single slot with custom start/end time.
   */
  @Post('slots')
  @HttpCode(201)
  async createSingleSlot(
    @Req() req: AuthenticatedRequest,
    @Body() body: { date: string; startTime: string; endTime: string },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const date = SlotDate.create(body.date);

    if (!body.startTime || !body.endTime) {
      throw new BadRequestException({
        error: 'MISSING_TIME',
        message: '開始時間と終了時間を指定してください',
      });
    }

    const startTime = TimeOfDay.fromString(body.startTime);
    const endTime = TimeOfDay.fromString(body.endTime);
    const timeRange = TimeRange.create(startTime, endTime);
    const duration = Duration.create(timeRange.durationInMinutes());

    let dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(ownerId, date);
    if (!dailySlotList) {
      dailySlotList = DailySlotList.create({ ownerId, date });
    }

    const newSlot = Slot.create({
      slotId: SlotId.generate(),
      startTime,
      endTime,
      durationMinutes: duration,
      status: SlotStatus.available(),
      reservationId: null,
    });

    try {
      dailySlotList.addSlot(newSlot);
    } catch (e) {
      if (e instanceof SlotOverlapError) {
        throw new BadRequestException({
          error: 'SLOT_OVERLAP',
          message: '指定した時間帯は既存のスロットと重複しています',
        });
      }
      throw e;
    }
    await this.dailySlotListRepo.save(dailySlotList);

    return {
      slotId: newSlot.slotId.value,
      startTime: newSlot.startTime.toString(),
      endTime: newSlot.endTime.toString(),
      durationMinutes: newSlot.durationMinutes,
      status: newSlot.status.toPact(),
    };
  }

  /**
   * DELETE /api/schedule/slots/:slotId
   * Deletes an available slot. Booked slots cannot be deleted.
   */
  @Delete('slots/:slotId')
  @HttpCode(200)
  async deleteSlot(
    @Req() req: AuthenticatedRequest,
    @Param('slotId') slotIdParam: string,
  ) {
    const slotId = SlotId.create(slotIdParam);

    const found = await this.dailySlotListRepo.findSlotById(slotId);
    if (!found) {
      throw new NotFoundException({
        error: 'SLOT_NOT_FOUND',
        message: '指定されたスロットが見つかりません',
      });
    }

    // Verify ownership
    if (found.dailySlotList.ownerId.value !== req.user.ownerId) {
      throw new NotFoundException({
        error: 'SLOT_NOT_FOUND',
        message: '指定されたスロットが見つかりません',
      });
    }

    try {
      found.dailySlotList.removeSlot(slotId);
    } catch (e) {
      if (e instanceof SlotNotAvailableError) {
        throw new BadRequestException({
          error: 'SLOT_NOT_AVAILABLE',
          message: '予約済みのスロットは削除できません',
        });
      }
      if (e instanceof SlotNotFoundError) {
        throw new NotFoundException({
          error: 'SLOT_NOT_FOUND',
          message: '指定されたスロットが見つかりません',
        });
      }
      throw e;
    }

    await this.dailySlotListRepo.save(found.dailySlotList);

    return { message: 'スロットを削除しました' };
  }

  // ===== Template endpoints =====

  /**
   * GET /api/schedule/templates
   * Returns all slot templates for the authenticated owner.
   */
  @Get('templates')
  async getTemplates(@Req() req: AuthenticatedRequest) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const templates = await this.slotTemplateRepo.findAllByOwnerId(ownerId);
    return {
      templates: templates.map((t) => ({
        templateId: t.templateId.value,
        name: t.name,
        entries: t.entries.map((e) => ({
          startTime: e.startTime.toString(),
          endTime: e.endTime.toString(),
        })),
      })),
    };
  }

  /**
   * POST /api/schedule/templates
   * Creates a slot template from a list of time entries, or from a date's current slots.
   */
  @Post('templates')
  @HttpCode(201)
  async createTemplate(
    @Req() req: AuthenticatedRequest,
    @Body() body: {
      name: string;
      entries?: { startTime: string; endTime: string }[];
      fromDate?: string;
    },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);

    if (!body.name || body.name.trim().length === 0) {
      throw new BadRequestException({
        error: 'MISSING_NAME',
        message: 'テンプレート名を指定してください',
      });
    }

    let entries: { startTime: TimeOfDay; endTime: TimeOfDay }[];

    if (body.fromDate) {
      // Build entries from existing slots on the given date
      const date = SlotDate.create(body.fromDate);
      const dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(ownerId, date);
      if (!dailySlotList || dailySlotList.slots.length === 0) {
        throw new BadRequestException({
          error: 'NO_SLOTS',
          message: '指定日にスロットがありません',
        });
      }
      entries = dailySlotList.slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    } else if (body.entries && body.entries.length > 0) {
      entries = body.entries.map((e) => ({
        startTime: TimeOfDay.fromString(e.startTime),
        endTime: TimeOfDay.fromString(e.endTime),
      }));
    } else {
      throw new BadRequestException({
        error: 'MISSING_ENTRIES',
        message: 'スロット定義またはfromDateを指定してください',
      });
    }

    const template = SlotTemplate.create({
      templateId: SlotTemplateId.generate(),
      ownerId,
      name: body.name.trim(),
      entries,
    });

    await this.slotTemplateRepo.save(template);

    return {
      templateId: template.templateId.value,
      name: template.name,
      entries: template.entries.map((e) => ({
        startTime: e.startTime.toString(),
        endTime: e.endTime.toString(),
      })),
    };
  }

  /**
   * DELETE /api/schedule/templates/:templateId
   */
  @Delete('templates/:templateId')
  @HttpCode(200)
  async deleteTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('templateId') templateIdParam: string,
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const templateId = SlotTemplateId.create(templateIdParam);
    const template = await this.slotTemplateRepo.findById(templateId);
    if (!template || template.ownerId.value !== ownerId.value) {
      throw new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: 'テンプレートが見つかりません',
      });
    }
    await this.slotTemplateRepo.delete(templateId);
    return { message: 'テンプレートを削除しました' };
  }

  /**
   * POST /api/schedule/templates/:templateId/apply
   * Applies a template to a single date or to all business days in a date range.
   * Body: { date?: string, startDate?: string, endDate?: string, clearExisting?: boolean }
   *
   * When clearExisting is true, all available (non-booked) slots are removed
   * before applying the template, ensuring all template entries are applied.
   */
  @Post('templates/:templateId/apply')
  @HttpCode(200)
  async applyTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('templateId') templateIdParam: string,
    @Body() body: { date?: string; startDate?: string; endDate?: string; clearExisting?: boolean },
  ) {
    const ownerId = OwnerId.create(req.user.ownerId);
    const templateId = SlotTemplateId.create(templateIdParam);
    const template = await this.slotTemplateRepo.findById(templateId);
    if (!template || template.ownerId.value !== ownerId.value) {
      throw new NotFoundException({
        error: 'TEMPLATE_NOT_FOUND',
        message: 'テンプレートが見つかりません',
      });
    }

    const clearExisting = body.clearExisting === true;

    // Collect target dates
    const targetDates: SlotDate[] = [];

    if (body.date) {
      targetDates.push(SlotDate.create(body.date));
    } else if (body.startDate && body.endDate) {
      // Apply to business days in the range
      const start = new Date(body.startDate + 'T00:00:00');
      const end = new Date(body.endDate + 'T00:00:00');
      const businessHours = await this.businessHourRepo.findAllByOwnerId(ownerId);
      const closedStartDate = SlotDate.create(body.startDate);
      const closedEndDate = SlotDate.create(body.endDate);
      const closedDays = await this.closedDayRepo.findAllByOwnerIdAndDateRange(
        ownerId,
        closedStartDate,
        closedEndDate,
      );
      const closedSet = new Set(closedDays.map((cd) => cd.date.value));

      const dayKeyMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const iso = d.getFullYear() + '-' +
          String(d.getMonth() + 1).padStart(2, '0') + '-' +
          String(d.getDate()).padStart(2, '0');

        if (closedSet.has(iso)) continue;

        const dow = dayKeyMap[d.getDay()];
        const bh = businessHours.find((b) => b.dayOfWeek.value === dow);
        if (bh && !bh.isBusinessDay) continue;

        targetDates.push(SlotDate.create(iso));
      }
    } else {
      throw new BadRequestException({
        error: 'MISSING_DATE',
        message: 'dateまたはstartDate+endDateを指定してください',
      });
    }

    // Apply template to each target date
    let totalAdded = 0;
    let totalSkipped = 0;
    const results: { date: string; added: number; skipped: number }[] = [];

    for (const date of targetDates) {
      let dailySlotList = await this.dailySlotListRepo.findByOwnerIdAndDate(ownerId, date);
      if (!dailySlotList) {
        dailySlotList = DailySlotList.create({ ownerId, date });
      }

      // Remove available (non-booked) slots before applying if requested
      if (clearExisting) {
        const availableSlotIds = dailySlotList.slots
          .filter((s) => s.isAvailable())
          .map((s) => s.slotId);
        for (const slotId of availableSlotIds) {
          dailySlotList.removeSlot(slotId);
        }
      }

      let added = 0;
      let skipped = 0;
      for (const entry of template.entries) {
        const timeRange = TimeRange.create(entry.startTime, entry.endTime);
        const duration = Duration.create(timeRange.durationInMinutes());
        const newSlot = Slot.create({
          slotId: SlotId.generate(),
          startTime: entry.startTime,
          endTime: entry.endTime,
          durationMinutes: duration,
          status: SlotStatus.available(),
          reservationId: null,
        });
        try {
          dailySlotList.addSlot(newSlot);
          added++;
        } catch (e) {
          if (e instanceof SlotOverlapError) {
            skipped++;
            continue;
          }
          throw e;
        }
      }

      if (added > 0 || clearExisting) {
        await this.dailySlotListRepo.save(dailySlotList);
        totalAdded += added;
      }
      totalSkipped += skipped;
      results.push({ date: date.value, added, skipped });
    }

    return {
      totalDates: targetDates.length,
      totalSlotsAdded: totalAdded,
      totalSkipped,
      results,
    };
  }

  // ===== Settings endpoints =====

  /**
   * GET /api/schedule/settings
   * Returns owner settings (cancellation policy, etc.)
   */
  @Get('settings')
  async getSettings(@Req() req: AuthenticatedRequest) {
    const ownerId = req.user.ownerId;
    const settings = await this.prisma.ownerSettings.findUnique({
      where: { ownerId },
    });
    return {
      cancellationPolicy: settings?.cancellationPolicy ?? '',
    };
  }

  /**
   * PUT /api/schedule/settings
   * Updates owner settings.
   */
  @Put('settings')
  @HttpCode(200)
  async updateSettings(
    @Req() req: AuthenticatedRequest,
    @Body() body: { cancellationPolicy?: string },
  ) {
    const ownerId = req.user.ownerId;
    await this.prisma.ownerSettings.upsert({
      where: { ownerId },
      update: { cancellationPolicy: body.cancellationPolicy ?? '' },
      create: { ownerId, cancellationPolicy: body.cancellationPolicy ?? '' },
    });
    return {
      cancellationPolicy: body.cancellationPolicy ?? '',
    };
  }
}
