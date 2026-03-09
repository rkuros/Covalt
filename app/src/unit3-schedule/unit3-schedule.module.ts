import { Module } from '@nestjs/common';
import { SlotController } from './controllers/slot.controller';
import { ScheduleController } from './controllers/schedule.controller';
import { SchedulePublicController } from './controllers/schedule-public.controller';
import { PrismaBusinessHourRepository } from './repositories/prisma-business-hour.repository';
import { PrismaClosedDayRepository } from './repositories/prisma-closed-day.repository';
import { PrismaDailySlotListRepository } from './repositories/prisma-daily-slot-list.repository';
import { PrismaSlotTemplateRepository } from './repositories/prisma-slot-template.repository';
import { SlotAvailabilityService } from './domain/SlotAvailabilityService';
import { SlotReservationService } from './domain/SlotReservationService';
import { SlotGenerationService } from './domain/SlotGenerationService';
import {
  BUSINESS_HOUR_REPOSITORY,
  CLOSED_DAY_REPOSITORY,
  DAILY_SLOT_LIST_REPOSITORY,
  SLOT_TEMPLATE_REPOSITORY,
} from './di-tokens';

@Module({
  controllers: [SlotController, ScheduleController, SchedulePublicController],
  providers: [
    // Repository implementations
    {
      provide: BUSINESS_HOUR_REPOSITORY,
      useClass: PrismaBusinessHourRepository,
    },
    {
      provide: CLOSED_DAY_REPOSITORY,
      useClass: PrismaClosedDayRepository,
    },
    {
      provide: DAILY_SLOT_LIST_REPOSITORY,
      useClass: PrismaDailySlotListRepository,
    },
    {
      provide: SLOT_TEMPLATE_REPOSITORY,
      useClass: PrismaSlotTemplateRepository,
    },
    // Domain services
    {
      provide: SlotAvailabilityService,
      useFactory: (
        businessHourRepo: PrismaBusinessHourRepository,
        closedDayRepo: PrismaClosedDayRepository,
        dailySlotListRepo: PrismaDailySlotListRepository,
      ) => new SlotAvailabilityService(businessHourRepo, closedDayRepo, dailySlotListRepo),
      inject: [BUSINESS_HOUR_REPOSITORY, CLOSED_DAY_REPOSITORY, DAILY_SLOT_LIST_REPOSITORY],
    },
    {
      provide: SlotReservationService,
      useFactory: (dailySlotListRepo: PrismaDailySlotListRepository) =>
        new SlotReservationService(dailySlotListRepo),
      inject: [DAILY_SLOT_LIST_REPOSITORY],
    },
    {
      provide: SlotGenerationService,
      useFactory: (
        businessHourRepo: PrismaBusinessHourRepository,
        closedDayRepo: PrismaClosedDayRepository,
        dailySlotListRepo: PrismaDailySlotListRepository,
      ) => new SlotGenerationService(businessHourRepo, closedDayRepo, dailySlotListRepo),
      inject: [BUSINESS_HOUR_REPOSITORY, CLOSED_DAY_REPOSITORY, DAILY_SLOT_LIST_REPOSITORY],
    },
  ],
  exports: [
    BUSINESS_HOUR_REPOSITORY,
    CLOSED_DAY_REPOSITORY,
    DAILY_SLOT_LIST_REPOSITORY,
    SLOT_TEMPLATE_REPOSITORY,
    SlotAvailabilityService,
    SlotReservationService,
    SlotGenerationService,
  ],
})
export class Unit3ScheduleModule {}
