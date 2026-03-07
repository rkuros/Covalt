import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Repositories
import { PrismaNotificationRecordRepository } from './repositories/prisma-notification-record.repository';
import { PrismaReminderScheduleRepository } from './repositories/prisma-reminder-schedule.repository';

// Gateways
import { HttpLineMessageSender } from './gateways/http-line-message-sender';

// Domain Services
import { NotificationDispatcher } from './domain/NotificationDispatcher';
import { NotificationTemplateResolver } from './domain/NotificationTemplateResolver';
import { ReminderScheduler } from './domain/ReminderScheduler';
import { ReservationEventHandler } from './domain/ReservationEventHandler';

// Handlers
import { ReservationEventNestHandler } from './handlers/reservation-event.handler';

// Cron
import { ReminderCronService } from './cron/reminder.cron';

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  providers: [
    // Infrastructure: Repositories
    PrismaNotificationRecordRepository,
    PrismaReminderScheduleRepository,

    // Infrastructure: Gateways
    HttpLineMessageSender,

    // Domain: NotificationTemplateResolver (pure domain, no dependencies)
    {
      provide: NotificationTemplateResolver,
      useFactory: () => new NotificationTemplateResolver(),
    },

    // Domain: ReminderScheduler (pure domain, no dependencies)
    {
      provide: ReminderScheduler,
      useFactory: () => new ReminderScheduler(),
    },

    // Domain: NotificationDispatcher
    {
      provide: NotificationDispatcher,
      useFactory: (
        templateResolver: NotificationTemplateResolver,
        messageSender: HttpLineMessageSender,
        recordRepo: PrismaNotificationRecordRepository,
      ) => new NotificationDispatcher(templateResolver, messageSender, recordRepo),
      inject: [
        NotificationTemplateResolver,
        HttpLineMessageSender,
        PrismaNotificationRecordRepository,
      ],
    },

    // Domain: ReservationEventHandler
    {
      provide: ReservationEventHandler,
      useFactory: (
        dispatcher: NotificationDispatcher,
        reminderScheduler: ReminderScheduler,
      ) => new ReservationEventHandler(dispatcher, reminderScheduler),
      inject: [NotificationDispatcher, ReminderScheduler],
    },

    // NestJS EventEmitter handler
    {
      provide: ReservationEventNestHandler,
      useFactory: (domainHandler: ReservationEventHandler) =>
        new ReservationEventNestHandler(domainHandler),
      inject: [ReservationEventHandler],
    },

    // Cron: リマインダー定期実行 (US-C13)
    {
      provide: ReminderCronService,
      useFactory: (
        reminderRepo: PrismaReminderScheduleRepository,
        messageSender: HttpLineMessageSender,
      ) => new ReminderCronService(reminderRepo, messageSender),
      inject: [PrismaReminderScheduleRepository, HttpLineMessageSender],
    },
  ],
  exports: [
    NotificationDispatcher,
    PrismaNotificationRecordRepository,
    PrismaReminderScheduleRepository,
  ],
})
export class Unit5NotificationModule {}
