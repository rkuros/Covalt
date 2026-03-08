import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { CustomerQueryService } from '../domain/CustomerQueryService';
import { CustomerCommandService } from '../domain/CustomerCommandService';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('api/customers')
@UseGuards(AuthGuard)
export class CustomerController {
  constructor(
    private readonly queryService: CustomerQueryService,
    private readonly commandService: CustomerCommandService,
  ) {}

  /**
   * GET /api/customers/by-line-user?ownerId=xxx&lineUserId=yyy
   *
   * Note: This route must be registered before /:customerId
   * to avoid "by-line-user" being captured as a customerId param.
   */
  @Get('by-line-user')
  async findByLineUser(
    @Query('ownerId') ownerId: string,
    @Query('lineUserId') lineUserId: string,
  ) {
    const result = await this.queryService.findByLineUserId(
      ownerId,
      lineUserId,
    );

    if (!result) {
      throw new NotFoundException({
        error: 'CUSTOMER_NOT_FOUND',
        message: '指定された顧客が見つかりません',
      });
    }

    return result;
  }

  /**
   * GET /api/customers/search?ownerId=xxx&q=yyy
   */
  @Get('search')
  async search(
    @Query('ownerId') ownerId: string,
    @Query('q') query: string,
  ) {
    return this.queryService.searchByName(ownerId, query ?? '');
  }

  /**
   * GET /api/customers/:customerId
   */
  @Get(':customerId')
  async findById(@Param('customerId') customerId: string) {
    const result = await this.queryService.findById(customerId);

    if (!result) {
      throw new NotFoundException({
        error: 'CUSTOMER_NOT_FOUND',
        message: '指定された顧客が見つかりません',
      });
    }

    return result;
  }

  /**
   * POST /api/customers
   * Body: { ownerId, customerName }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: { ownerId: string; customerName: string }) {
    if (!body.ownerId || !body.customerName) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'ownerId and customerName are required',
      });
    }
    return this.commandService.createManual({
      ownerId: body.ownerId,
      customerName: body.customerName,
    });
  }
}
