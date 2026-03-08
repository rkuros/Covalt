import { Module } from '@nestjs/common';
import { CustomerController } from './controllers/customer.controller';
import { CustomerDataController } from './controllers/customer-data.controller';
import { PrismaCustomerRepository } from './repositories/prisma-customer.repository';
import { CustomerQueryService } from './domain/CustomerQueryService';
import { CustomerCommandService } from './domain/CustomerCommandService';
import { CustomerAutoRegistrationHandler } from './domain/CustomerAutoRegistrationHandler';
import { LineFriendAddedNestHandler } from './handlers/line-friend-added.handler';

/**
 * CUSTOMER_REPOSITORY トークン
 * ドメインの CustomerRepository インターフェースを NestJS DI で注入するためのトークン。
 */
export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');

@Module({
  controllers: [CustomerController, CustomerDataController],
  providers: [
    // Repository
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: PrismaCustomerRepository,
    },

    // Domain Services
    {
      provide: CustomerQueryService,
      useFactory: (repository: PrismaCustomerRepository) =>
        new CustomerQueryService(repository),
      inject: [CUSTOMER_REPOSITORY],
    },
    {
      provide: CustomerCommandService,
      useFactory: (repository: PrismaCustomerRepository) =>
        new CustomerCommandService(repository),
      inject: [CUSTOMER_REPOSITORY],
    },

    // Domain Handlers
    {
      provide: CustomerAutoRegistrationHandler,
      useFactory: (commandService: CustomerCommandService) =>
        new CustomerAutoRegistrationHandler(commandService),
      inject: [CustomerCommandService],
    },

    // NestJS Event Handler
    LineFriendAddedNestHandler,
  ],
  exports: [CustomerQueryService, CustomerCommandService, CUSTOMER_REPOSITORY],
})
export class Unit6CustomerModule {}
