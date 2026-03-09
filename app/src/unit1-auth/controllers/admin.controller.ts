import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AccountProvisioningService } from '../domain/AccountProvisioningService';
import { AccountManagementService } from '../domain/AccountManagementService';

@Controller('api/admin/accounts')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(
    private readonly accountProvisioningService: AccountProvisioningService,
    private readonly accountManagementService: AccountManagementService,
  ) {}

  /**
   * POST /api/admin/accounts
   * 新規オーナーアカウントを作成する。
   */
  @Post()
  @HttpCode(201)
  async createAccount(@Body() body: { email: string }) {
    try {
      const account = await this.accountProvisioningService.provision(
        body.email,
      );
      return {
        ownerId: account.ownerId,
        email: account.email.value,
        status: account.status.value,
        createdAt: account.createdAt.toISOString(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'アカウント作成に失敗しました';
      throw new HttpException(
        { error: 'BAD_REQUEST', message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * GET /api/admin/accounts
   * オーナーアカウント一覧を取得する。
   */
  @Get()
  @HttpCode(200)
  async listAccounts() {
    const accounts = await this.accountManagementService.listAccounts();
    return accounts.map((account) => ({
      ownerId: account.ownerId,
      email: account.email.value,
      status: account.status.value,
      createdAt: account.createdAt.toISOString(),
    }));
  }

  /**
   * PATCH /api/admin/accounts/:ownerId/status
   * アカウントの有効化/無効化を行う。
   */
  @Patch(':ownerId/status')
  @HttpCode(200)
  async updateAccountStatus(
    @Param('ownerId') ownerId: string,
    @Body() body: { status: 'ACTIVE' | 'DISABLED' },
  ) {
    try {
      if (body.status === 'ACTIVE') {
        await this.accountManagementService.activateAccount(ownerId);
      } else if (body.status === 'DISABLED') {
        await this.accountManagementService.disableAccount(ownerId);
      } else {
        throw new Error(
          'ステータスは ACTIVE または DISABLED を指定してください',
        );
      }
      return { ownerId, status: body.status };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ステータス更新に失敗しました';
      throw new HttpException(
        { error: 'BAD_REQUEST', message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
