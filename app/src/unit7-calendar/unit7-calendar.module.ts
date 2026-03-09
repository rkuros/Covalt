import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Repositories
import { PrismaCalendarIntegrationRepository } from './repositories/prisma-calendar-integration.repository';
import { PrismaCalendarEventMappingRepository } from './repositories/prisma-calendar-event-mapping.repository';

// Gateways
import { GoogleOAuthGatewayImpl } from './gateways/google-oauth.gateway';
import { GoogleCalendarApiGatewayImpl } from './gateways/google-calendar-api.gateway';

// Domain Services
import { GoogleOAuthService } from './domain/GoogleOAuthService';
import { CalendarIntegrationService } from './domain/CalendarIntegrationService';
import { CalendarSyncService } from './domain/CalendarSyncService';
import { ReservationEventHandler } from './domain/ReservationEventHandler';

// Handlers
import { CalendarReservationEventHandler } from './handlers/reservation-event.handler';

// Controllers
import { CalendarController } from './controllers/calendar.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [CalendarController],
  providers: [
    // Infrastructure: Repositories
    PrismaCalendarIntegrationRepository,
    PrismaCalendarEventMappingRepository,

    // Infrastructure: Gateways
    GoogleOAuthGatewayImpl,
    GoogleCalendarApiGatewayImpl,

    // Domain: GoogleOAuthService
    {
      provide: GoogleOAuthService,
      useFactory: (oauthGateway: GoogleOAuthGatewayImpl) =>
        new GoogleOAuthService(oauthGateway),
      inject: [GoogleOAuthGatewayImpl],
    },

    // Domain: CalendarIntegrationService
    {
      provide: CalendarIntegrationService,
      useFactory: (
        integrationRepo: PrismaCalendarIntegrationRepository,
        oauthService: GoogleOAuthService,
        calendarApiClient: GoogleCalendarApiGatewayImpl,
      ) =>
        new CalendarIntegrationService(
          integrationRepo,
          oauthService,
          calendarApiClient,
        ),
      inject: [
        PrismaCalendarIntegrationRepository,
        GoogleOAuthService,
        GoogleCalendarApiGatewayImpl,
      ],
    },

    // Domain: CalendarSyncService
    {
      provide: CalendarSyncService,
      useFactory: (
        integrationRepo: PrismaCalendarIntegrationRepository,
        mappingRepo: PrismaCalendarEventMappingRepository,
        calendarApiClient: GoogleCalendarApiGatewayImpl,
        oauthService: GoogleOAuthService,
      ) =>
        new CalendarSyncService(
          integrationRepo,
          mappingRepo,
          calendarApiClient,
          oauthService,
        ),
      inject: [
        PrismaCalendarIntegrationRepository,
        PrismaCalendarEventMappingRepository,
        GoogleCalendarApiGatewayImpl,
        GoogleOAuthService,
      ],
    },

    // Domain: ReservationEventHandler
    {
      provide: ReservationEventHandler,
      useFactory: (syncService: CalendarSyncService) =>
        new ReservationEventHandler(syncService),
      inject: [CalendarSyncService],
    },

    // NestJS EventEmitter handler
    {
      provide: CalendarReservationEventHandler,
      useFactory: (domainHandler: ReservationEventHandler) =>
        new CalendarReservationEventHandler(domainHandler),
      inject: [ReservationEventHandler],
    },
  ],
  exports: [
    CalendarIntegrationService,
    PrismaCalendarIntegrationRepository,
    PrismaCalendarEventMappingRepository,
  ],
})
export class Unit7CalendarModule {}
