import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { CustomerReservationController } from './controllers/customer-reservation.controller';
import { OwnerReservationController } from './controllers/owner-reservation.controller';

// Repository
import { PrismaReservationRepository } from './repositories/prisma-reservation.repository';

// Gateways (direct in-process calls instead of HTTP)
import { DirectSlotGateway } from './gateways/direct-slot.gateway';
import { DirectCustomerGateway } from './gateways/direct-customer.gateway';
import { DirectLiffGateway } from './gateways/direct-liff.gateway';
import { NestjsEventPublisher } from './gateways/nestjs-event.publisher';

// Domain
import { ReservationCommandService } from './domain/ReservationCommandService';

// Common
import { AuthGuard } from '../common/guards/auth.guard';

// Cross-module imports
import { Unit3ScheduleModule } from '../unit3-schedule/unit3-schedule.module';
import { Unit6CustomerModule } from '../unit6-customer/customer.module';
import { Unit2LineModule } from '../unit2-line/unit2-line.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    Unit3ScheduleModule,
    Unit6CustomerModule,
    Unit2LineModule,
  ],
  controllers: [CustomerReservationController, OwnerReservationController],
  providers: [
    // AuthGuard (used by OwnerReservationController)
    AuthGuard,

    // Repository
    {
      provide: 'ReservationRepository',
      useClass: PrismaReservationRepository,
    },

    // Gateways
    {
      provide: 'SlotGateway',
      useClass: DirectSlotGateway,
    },
    {
      provide: 'CustomerGateway',
      useClass: DirectCustomerGateway,
    },
    {
      provide: 'LiffGateway',
      useClass: DirectLiffGateway,
    },
    {
      provide: 'EventPublisher',
      useClass: NestjsEventPublisher,
    },

    // Domain Service
    {
      provide: ReservationCommandService,
      useFactory: (
        reservationRepository: PrismaReservationRepository,
        slotGateway: DirectSlotGateway,
        customerGateway: DirectCustomerGateway,
        eventPublisher: NestjsEventPublisher,
      ) =>
        new ReservationCommandService(
          reservationRepository,
          slotGateway,
          customerGateway,
          eventPublisher,
        ),
      inject: [
        'ReservationRepository',
        'SlotGateway',
        'CustomerGateway',
        'EventPublisher',
      ],
    },
  ],
  exports: ['ReservationRepository', ReservationCommandService],
})
export class ReservationModule {}
