import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CalendarIntegrationService } from '../domain/CalendarIntegrationService';

interface AuthenticatedRequest {
  user: { ownerId: string; email: string; role: string };
}

@Controller('api/calendar')
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(
    private readonly integrationService: CalendarIntegrationService,
  ) {}

  // ==========================================
  // POST /api/calendar/connect (OAuth開始)
  // ==========================================
  @Post('connect')
  @HttpCode(HttpStatus.OK)
  async connect(@Req() req: AuthenticatedRequest) {
    try {
      const result = await this.integrationService.startOAuthFlow(
        req.user.ownerId,
      );
      return {
        authorizationUrl: result.authorizationUrl,
        integrationId: result.integrationId,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException({
          error: 'OAUTH_START_FAILED',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // POST /api/calendar/callback (OAuthコールバック)
  // ==========================================
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  async callback(@Body() body: { integrationId: string; code: string }) {
    try {
      await this.integrationService.completeOAuthFlow(
        body.integrationId,
        body.code,
      );
      return { status: 'connected' };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException({
          error: 'OAUTH_CALLBACK_FAILED',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // GET /api/calendar/status (連携状態確認)
  // ==========================================
  @Get('status')
  async getStatus(@Req() req: AuthenticatedRequest) {
    try {
      // CalendarIntegrationService does not expose getStatus directly, so we use listCalendars
      // as a proxy for checking connectivity; if it throws, integration is not set up
      const calendars = await this.integrationService.listCalendars(
        req.user.ownerId,
      );
      return {
        connected: true,
        calendarCount: calendars.length,
      };
    } catch {
      return {
        connected: false,
        calendarCount: 0,
      };
    }
  }

  // ==========================================
  // DELETE /api/calendar/disconnect (連携解除)
  // ==========================================
  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@Req() req: AuthenticatedRequest) {
    try {
      await this.integrationService.deactivateIntegration(req.user.ownerId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('見つかりません')) {
        throw new NotFoundException({
          error: 'INTEGRATION_NOT_FOUND',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // GET /api/calendar/calendars (カレンダー一覧)
  // ==========================================
  @Get('calendars')
  async listCalendars(@Req() req: AuthenticatedRequest) {
    try {
      const calendars = await this.integrationService.listCalendars(
        req.user.ownerId,
      );
      return { calendars };
    } catch (error) {
      if (error instanceof Error && error.message.includes('見つかりません')) {
        throw new NotFoundException({
          error: 'INTEGRATION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof Error && error.message.includes('再認証')) {
        throw new BadRequestException({
          error: 'REQUIRES_REAUTH',
          message: error.message,
        });
      }
      throw error;
    }
  }

  // ==========================================
  // PUT /api/calendar/select (カレンダー選択)
  // ==========================================
  @Put('select')
  @HttpCode(HttpStatus.OK)
  async selectCalendar(
    @Req() req: AuthenticatedRequest,
    @Body() body: { calendarId: string },
  ) {
    try {
      await this.integrationService.selectCalendar(
        req.user.ownerId,
        body.calendarId,
      );
      return { status: 'selected', calendarId: body.calendarId };
    } catch (error) {
      if (error instanceof Error && error.message.includes('見つかりません')) {
        throw new NotFoundException({
          error: 'INTEGRATION_NOT_FOUND',
          message: error.message,
        });
      }
      if (error instanceof Error && error.message.includes('再認証')) {
        throw new BadRequestException({
          error: 'REQUIRES_REAUTH',
          message: error.message,
        });
      }
      throw error;
    }
  }
}
