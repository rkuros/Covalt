import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpCode,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CustomerDataStorageService } from '../../unit6-customer/domain/CustomerDataStorageService';
import { ReservationCommandService } from '../domain/ReservationCommandService';
import type { ReservationRepository } from '../domain/ReservationRepository';
import type { LiffGateway } from '../domain/LiffGateway';
import type { CustomerGateway } from '../domain/CustomerGateway';
import { ActorType } from '../domain/ActorType';
import { CustomerId } from '../domain/CustomerId';
import { OwnerId } from '../domain/OwnerId';
import { LineUserId } from '../domain/LineUserId';
import {
  toReservationResponse,
  handleDomainError,
} from './reservation-response.helper';
import { randomUUID } from 'crypto';

// --- Request DTOs ---

interface CreateReservationBody {
  ownerId: string;
  slotId: string;
  dateTime: string;
  durationMinutes: number;
}

interface ModifyReservationBody {
  newSlotId: string;
  newDateTime: string;
  newDurationMinutes: number;
}

@Controller('api/reservations')
export class CustomerReservationController {
  private readonly logger = new Logger(CustomerReservationController.name);

  constructor(
    private readonly commandService: ReservationCommandService,
    @Inject('ReservationRepository')
    private readonly reservationRepository: ReservationRepository,
    @Inject('LiffGateway')
    private readonly liffGateway: LiffGateway,
    @Inject('CustomerGateway')
    private readonly customerGateway: CustomerGateway,
    private readonly prisma: PrismaService,
    private readonly storage: CustomerDataStorageService,
  ) {}

  /**
   * POST /api/reservations
   * LIFF 経由での予約作成
   */
  @Post()
  async create(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
    @Body() body: CreateReservationBody,
  ) {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!body.ownerId || !body.slotId) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'ownerId and slotId are required',
      });
    }

    try {
      const reservation = await this.commandService.createReservation({
        ownerId: body.ownerId,
        slotId: body.slotId,
        dateTime: body.dateTime,
        durationMinutes: body.durationMinutes,
        lineUserId: liffResult.lineUserId,
        displayName: liffResult.displayName,
        createdBy: ActorType.Customer,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      handleDomainError(error, this.logger);
    }
  }

  /**
   * GET /api/reservations/upcoming
   * 顧客の未来予約一覧
   */
  @Get('upcoming')
  async getUpcoming(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!ownerIdHeader) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'x-owner-id header is required',
      });
    }

    try {
      const ownerId = OwnerId.create(ownerIdHeader);
      const lineUserId = LineUserId.create(liffResult.lineUserId);
      if (!lineUserId) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Invalid lineUserId',
        });
      }

      const customer = await this.customerGateway.findByLineUserId(
        ownerId,
        lineUserId,
      );
      if (!customer) {
        return { reservations: [] };
      }

      const customerId = CustomerId.create(customer.customerId);
      const reservations =
        await this.reservationRepository.findUpcomingByCustomerId(
          customerId,
          ownerId,
        );

      return {
        reservations: reservations.map((r) => toReservationResponse(r)),
      };
    } catch (error) {
      handleDomainError(error, this.logger);
    }
  }

  /**
   * GET /api/reservations/history
   * 顧客の過去予約一覧
   */
  @Get('history')
  async getHistory(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!ownerIdHeader) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'x-owner-id header is required',
      });
    }

    try {
      const ownerId = OwnerId.create(ownerIdHeader);
      const lineUserId = LineUserId.create(liffResult.lineUserId);
      if (!lineUserId) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Invalid lineUserId',
        });
      }

      const customer = await this.customerGateway.findByLineUserId(
        ownerId,
        lineUserId,
      );
      if (!customer) {
        return { reservations: [] };
      }

      const customerId = CustomerId.create(customer.customerId);
      const reservations =
        await this.reservationRepository.findPastByCustomerId(
          customerId,
          ownerId,
        );

      return {
        reservations: reservations.map((r) => toReservationResponse(r)),
      };
    } catch (error) {
      handleDomainError(error, this.logger);
    }
  }

  /**
   * PUT /api/reservations/:id/modify
   * 予約変更
   */
  @Put(':id/modify')
  async modify(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
    @Param('id') id: string,
    @Body() body: ModifyReservationBody,
  ) {
    await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!body.newSlotId || !body.newDateTime || !body.newDurationMinutes) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'newSlotId, newDateTime, and newDurationMinutes are required',
      });
    }

    try {
      const reservation = await this.commandService.modifyReservation({
        reservationId: id,
        newSlotId: body.newSlotId,
        newDateTime: body.newDateTime,
        newDurationMinutes: body.newDurationMinutes,
        modifiedBy: ActorType.Customer,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      handleDomainError(error, this.logger);
    }
  }

  /**
   * PUT /api/reservations/:id/cancel
   * 予約キャンセル
   */
  @Put(':id/cancel')
  async cancel(
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
    @Param('id') id: string,
  ) {
    await this.verifyLiffToken(authHeader, mockAuthHeader);

    try {
      const reservation = await this.commandService.cancelReservation({
        reservationId: id,
        cancelledBy: ActorType.Customer,
      });

      return toReservationResponse(reservation);
    } catch (error) {
      handleDomainError(error, this.logger);
    }
  }

  // --- Customer-facing read-only endpoints for notes/attachments/photos ---
  // These bypass AuthGuard and use verifyLiffToken() directly,
  // so they work with both LIFF access tokens and mock mode.

  /**
   * Resolve the authenticated LIFF user to a customerId, verifying they
   * belong to the given owner.
   */
  private async resolveCustomer(
    authHeader: string | undefined,
    mockAuthHeader: string | undefined,
    ownerIdHeader: string | undefined,
  ): Promise<{ customerId: string; ownerId: string }> {
    const liffResult = await this.verifyLiffToken(authHeader, mockAuthHeader);

    if (!ownerIdHeader) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'x-owner-id header is required',
      });
    }

    const ownerId = OwnerId.create(ownerIdHeader);
    const lineUserId = LineUserId.create(liffResult.lineUserId);
    if (!lineUserId) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Invalid lineUserId',
      });
    }

    const customer = await this.customerGateway.findByLineUserId(
      ownerId,
      lineUserId,
    );
    if (!customer) {
      throw new NotFoundException({
        error: 'CUSTOMER_NOT_FOUND',
        message: '顧客が見つかりません',
      });
    }

    return { customerId: customer.customerId, ownerId: ownerId.value };
  }

  /**
   * GET /api/reservations/customer-data/:customerId/notes
   * Customer-facing: list notes metadata.
   */
  @Get('customer-data/:customerId/notes')
  async listCustomerNotes(
    @Param('customerId') customerId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const resolved = await this.resolveCustomer(
      authHeader,
      mockAuthHeader,
      ownerIdHeader,
    );

    if (resolved.customerId !== customerId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: '他の顧客のデータにはアクセスできません',
      });
    }

    const notes = await this.prisma.customerNote.findMany({
      where: { customerId, ownerId: resolved.ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      notes: notes.map((n) => ({
        noteId: n.id,
        customerId: n.customerId,
        category: n.category,
        title: n.title,
        noteDate: n.noteDate,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
    };
  }

  /**
   * GET /api/reservations/customer-data/:customerId/notes/:noteId
   * Customer-facing: get note content.
   */
  @Get('customer-data/:customerId/notes/:noteId')
  async getCustomerNote(
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const resolved = await this.resolveCustomer(
      authHeader,
      mockAuthHeader,
      ownerIdHeader,
    );

    if (resolved.customerId !== customerId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: '他の顧客のデータにはアクセスできません',
      });
    }

    const note = await this.prisma.customerNote.findFirst({
      where: { id: noteId, customerId, ownerId: resolved.ownerId },
    });
    if (!note) {
      throw new NotFoundException({
        error: 'NOTE_NOT_FOUND',
        message: '指定されたノートが見つかりません',
      });
    }

    const content = await this.storage.downloadNote(note.s3Key);

    return {
      noteId: note.id,
      customerId: note.customerId,
      category: note.category,
      title: note.title,
      noteDate: note.noteDate,
      content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  /**
   * GET /api/reservations/customer-data/:customerId/attachments
   * Customer-facing: list attachments metadata.
   */
  @Get('customer-data/:customerId/attachments')
  async listCustomerAttachments(
    @Param('customerId') customerId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const resolved = await this.resolveCustomer(
      authHeader,
      mockAuthHeader,
      ownerIdHeader,
    );

    if (resolved.customerId !== customerId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: '他の顧客のデータにはアクセスできません',
      });
    }

    const attachments = await this.prisma.customerAttachment.findMany({
      where: { customerId, ownerId: resolved.ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      attachments: attachments.map((a) => ({
        attachmentId: a.id,
        customerId: a.customerId,
        fileName: a.fileName,
        fileType: a.fileType,
        category: a.category,
        noteDate: a.noteDate,
        createdAt: a.createdAt,
      })),
    };
  }

  /**
   * GET /api/reservations/customer-data/:customerId/attachments/:attachmentId/url
   * Customer-facing: get presigned download URL for a photo/attachment.
   */
  @Get('customer-data/:customerId/attachments/:attachmentId/url')
  async getCustomerAttachmentUrl(
    @Param('customerId') customerId: string,
    @Param('attachmentId') attachmentId: string,
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const resolved = await this.resolveCustomer(
      authHeader,
      mockAuthHeader,
      ownerIdHeader,
    );

    if (resolved.customerId !== customerId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: '他の顧客のデータにはアクセスできません',
      });
    }

    const attachment = await this.prisma.customerAttachment.findFirst({
      where: { id: attachmentId, customerId, ownerId: resolved.ownerId },
    });
    if (!attachment) {
      throw new NotFoundException({
        error: 'ATTACHMENT_NOT_FOUND',
        message: '指定された添付ファイルが見つかりません',
      });
    }

    const presignedUrl = await this.storage.getDownloadUrl(
      attachment.s3Key,
      attachment.fileName,
    );

    return {
      attachmentId: attachment.id,
      presignedUrl,
    };
  }

  /**
   * POST /api/reservations/customer-data/:customerId/attachments/presigned-url
   * Customer-facing: generate presigned PUT URL for photo upload.
   */
  @Post('customer-data/:customerId/attachments/presigned-url')
  @HttpCode(HttpStatus.OK)
  async getCustomerUploadUrl(
    @Param('customerId') customerId: string,
    @Body()
    body: {
      fileName: string;
      fileType: string;
      category?: string;
      noteDate?: string;
    },
    @Headers('authorization') authHeader: string | undefined,
    @Headers('x-owner-id') ownerIdHeader: string | undefined,
    @Headers('x-mock-auth') mockAuthHeader: string | undefined,
  ) {
    const resolved = await this.resolveCustomer(
      authHeader,
      mockAuthHeader,
      ownerIdHeader,
    );

    if (resolved.customerId !== customerId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: '他の顧客のデータにはアクセスできません',
      });
    }

    const attachmentId = randomUUID();
    const category = body.category || 'photo';
    const folder = category === 'attachment' ? 'attachments' : 'photos';
    const ext = body.fileName.split('.').pop() || 'bin';
    const s3Key = `${resolved.ownerId}/${customerId}/${folder}/${attachmentId}.${ext}`;

    const presignedUrl = await this.storage.getUploadUrl(s3Key, body.fileType);

    await this.prisma.customerAttachment.create({
      data: {
        id: attachmentId,
        customerId,
        ownerId: resolved.ownerId,
        fileName: body.fileName,
        fileType: body.fileType,
        s3Key,
        category,
        noteDate: body.noteDate || null,
      },
    });

    return {
      attachmentId,
      presignedUrl,
      s3Key,
    };
  }

  // --- Private helpers ---

  private async verifyLiffToken(
    authHeader: string | undefined,
    mockAuthHeader?: string,
  ): Promise<{ lineUserId: string; displayName: string }> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'LIFF access token is required',
      });
    }

    // Mock mode: skip LIFF verification and return a mock identity
    if (mockAuthHeader === 'true') {
      return {
        lineUserId: 'U00000000000000000000000000000000',
        displayName: 'テストユーザー',
      };
    }

    const token = authHeader.slice(7);
    try {
      return await this.liffGateway.verifyLiffToken(token);
    } catch {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Invalid LIFF access token',
      });
    }
  }
}
