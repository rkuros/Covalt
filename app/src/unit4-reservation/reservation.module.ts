import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { CustomerReservationController } from './controllers/customer-reservation.controller';
import { OwnerReservationController } from './controllers/owner-reservation.controller';

// Repository
import { PrismaReservationRepository } from './repositories/prisma-reservation.repository';

// Gateways
import { HttpSlotGateway } from './gateways/http-slot.gateway';
import { HttpCustomerGateway } from './gateways/http-customer.gateway';
import { HttpAuthGateway } from './gateways/http-auth.gateway';
import { HttpLiffGateway } from './gateways/http-liff.gateway';
import { NestjsEventPublisher } from './gateways/nestjs-event.publisher';

// Domain
import { ReservationCommandService } from './domain/ReservationCommandService';

// Common
import { AuthGuard } from '../common/guards/auth.guard';

@Module({
  imports: [ConfigModule, EventEmitterModule],
  controllers: [
    CustomerReservationController,
    OwnerReservationController,
  ],
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
      useClass: HttpSlotGateway,
    },
    {
      provide: 'CustomerGateway',
      useClass: HttpCustomerGateway,
    },
    {
      provide: 'AuthGateway',
      useClass: HttpAuthGateway,
    },
    {
      provide: 'LiffGateway',
      useClass: HttpLiffGateway,
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
        slotGateway: HttpSlotGateway,
        customerGateway: HttpCustomerGateway,
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
