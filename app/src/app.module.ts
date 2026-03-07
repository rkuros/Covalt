import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './common/prisma/prisma.module';
import { EncryptionModule } from './common/crypto/encryption.module';
import { Unit1AuthModule } from './unit1-auth/unit1-auth.module';
import { Unit2LineModule } from './unit2-line/unit2-line.module';
import { Unit3ScheduleModule } from './unit3-schedule/unit3-schedule.module';
import { ReservationModule } from './unit4-reservation/reservation.module';
import { Unit5NotificationModule } from './unit5-notification/unit5-notification.module';
import { Unit6CustomerModule } from './unit6-customer/customer.module';
import { Unit7CalendarModule } from './unit7-calendar/unit7-calendar.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    EncryptionModule,
    Unit1AuthModule,
    Unit2LineModule,
    Unit3ScheduleModule,
    ReservationModule,
    Unit5NotificationModule,
    Unit6CustomerModule,
    Unit7CalendarModule,
  ],
})
export class AppModule {}
