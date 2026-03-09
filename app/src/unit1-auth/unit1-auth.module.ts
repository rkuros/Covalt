import { Module } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';

// Controllers
import { AuthController } from './controllers/auth.controller';
import { AdminController } from './controllers/admin.controller';

// Prisma Repositories
import { PrismaOwnerAccountRepository } from './repositories/prisma-owner-account.repository';
import { PrismaAdminAccountRepository } from './repositories/prisma-admin-account.repository';
import { PrismaSessionRepository } from './repositories/prisma-session.repository';
import { PrismaPasswordResetTokenRepository } from './repositories/prisma-password-reset-token.repository';

// Gateway
import { ConsoleEmailGateway } from './gateways/console-email.gateway';

// Domain Services
import { AuthenticationService } from './domain/AuthenticationService';
import { TokenVerificationService } from './domain/TokenVerificationService';
import { PasswordResetService } from './domain/PasswordResetService';
import { AccountProvisioningService } from './domain/AccountProvisioningService';
import { AccountManagementService } from './domain/AccountManagementService';

// DI Token 定数
const OWNER_ACCOUNT_REPOSITORY = 'OwnerAccountRepository';
const ADMIN_ACCOUNT_REPOSITORY = 'AdminAccountRepository';
const SESSION_REPOSITORY = 'SessionRepository';
const PASSWORD_RESET_TOKEN_REPOSITORY = 'PasswordResetTokenRepository';
const EMAIL_GATEWAY = 'EmailGateway';

@Module({
  controllers: [AuthController, AdminController],
  providers: [
    // Infrastructure
    AuthGuard,

    // Repositories
    {
      provide: OWNER_ACCOUNT_REPOSITORY,
      useClass: PrismaOwnerAccountRepository,
    },
    {
      provide: ADMIN_ACCOUNT_REPOSITORY,
      useClass: PrismaAdminAccountRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: PrismaSessionRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: PrismaPasswordResetTokenRepository,
    },

    // Gateway
    {
      provide: EMAIL_GATEWAY,
      useClass: ConsoleEmailGateway,
    },

    // Domain Services
    {
      provide: AuthenticationService,
      useFactory: (
        ownerAccountRepo: PrismaOwnerAccountRepository,
        sessionRepo: PrismaSessionRepository,
      ) => new AuthenticationService(ownerAccountRepo, sessionRepo),
      inject: [OWNER_ACCOUNT_REPOSITORY, SESSION_REPOSITORY],
    },
    {
      provide: TokenVerificationService,
      useFactory: (
        sessionRepo: PrismaSessionRepository,
        ownerAccountRepo: PrismaOwnerAccountRepository,
      ) => new TokenVerificationService(sessionRepo, ownerAccountRepo),
      inject: [SESSION_REPOSITORY, OWNER_ACCOUNT_REPOSITORY],
    },
    {
      provide: PasswordResetService,
      useFactory: (
        ownerAccountRepo: PrismaOwnerAccountRepository,
        passwordResetTokenRepo: PrismaPasswordResetTokenRepository,
        emailGateway: ConsoleEmailGateway,
      ) =>
        new PasswordResetService(
          ownerAccountRepo,
          passwordResetTokenRepo,
          emailGateway,
        ),
      inject: [
        OWNER_ACCOUNT_REPOSITORY,
        PASSWORD_RESET_TOKEN_REPOSITORY,
        EMAIL_GATEWAY,
      ],
    },
    {
      provide: AccountProvisioningService,
      useFactory: (
        ownerAccountRepo: PrismaOwnerAccountRepository,
        passwordResetTokenRepo: PrismaPasswordResetTokenRepository,
        emailGateway: ConsoleEmailGateway,
      ) =>
        new AccountProvisioningService(
          ownerAccountRepo,
          passwordResetTokenRepo,
          emailGateway,
        ),
      inject: [
        OWNER_ACCOUNT_REPOSITORY,
        PASSWORD_RESET_TOKEN_REPOSITORY,
        EMAIL_GATEWAY,
      ],
    },
    {
      provide: AccountManagementService,
      useFactory: (
        ownerAccountRepo: PrismaOwnerAccountRepository,
        sessionRepo: PrismaSessionRepository,
      ) => new AccountManagementService(ownerAccountRepo, sessionRepo),
      inject: [OWNER_ACCOUNT_REPOSITORY, SESSION_REPOSITORY],
    },
  ],
  exports: [TokenVerificationService],
})
export class Unit1AuthModule {}
