import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('api/schedule')
export class SchedulePublicController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/schedule/public-settings?ownerId=xxx
   * Returns public-facing settings (cancellation policy) for the given owner.
   */
  @Get('public-settings')
  async getPublicSettings(
    @Query('ownerId') ownerIdParam: string,
  ) {
    if (!ownerIdParam) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'ownerId query parameter is required',
      });
    }
    const settings = await this.prisma.ownerSettings.findUnique({
      where: { ownerId: ownerIdParam },
    });
    return {
      cancellationPolicy: settings?.cancellationPolicy ?? '',
    };
  }
}
