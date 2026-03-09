import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { randomUUID } from 'crypto';

const BUCKET = process.env['CUSTOMER_DATA_BUCKET'] || '';
const s3 = new S3Client({});

@Controller('api/customers')
@UseGuards(AuthGuard)
export class CustomerDataController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify the customer belongs to the authenticated owner.
   */
  private async verifyOwnership(
    customerId: string,
    ownerId: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException({
        error: 'CUSTOMER_NOT_FOUND',
        message: '指定された顧客が見つかりません',
      });
    }
    if (customer.ownerId !== ownerId) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'この顧客へのアクセス権がありません',
      });
    }
  }

  // ---- Profile ----

  /**
   * PUT /api/customers/:customerId/profile
   * Update birthDate and gender.
   */
  @Put(':customerId/profile')
  async updateProfile(
    @Param('customerId') customerId: string,
    @Body() body: { birthDate?: string; gender?: string },
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        birthDate: body.birthDate ?? undefined,
        gender: body.gender ?? undefined,
      },
    });

    return {
      customerId: updated.id,
      birthDate: updated.birthDate,
      gender: updated.gender,
    };
  }

  // ---- Notes / Records ----

  /**
   * GET /api/customers/:customerId/notes
   * List notes/records metadata (from DB).
   */
  @Get(':customerId/notes')
  async listNotes(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const notes = await this.prisma.customerNote.findMany({
      where: { customerId, ownerId },
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
   * POST /api/customers/:customerId/notes
   * Create a note/record. Save metadata to DB, content to S3.
   */
  @Post(':customerId/notes')
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Param('customerId') customerId: string,
    @Body() body: { category: string; title: string; content: string; noteDate?: string },
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const noteId = randomUUID();
    const folder = body.category === 'record' ? 'records' : 'notes';
    const s3Key = `${ownerId}/${customerId}/${folder}/${noteId}.txt`;

    // Upload content to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: body.content,
        ContentType: 'text/plain; charset=utf-8',
      }),
    );

    // Save metadata to DB
    const note = await this.prisma.customerNote.create({
      data: {
        id: noteId,
        customerId,
        ownerId,
        category: body.category,
        title: body.title || '',
        noteDate: body.noteDate || null,
        s3Key,
      },
    });

    return {
      noteId: note.id,
      customerId: note.customerId,
      category: note.category,
      title: note.title,
      noteDate: note.noteDate,
      s3Key: note.s3Key,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  /**
   * GET /api/customers/:customerId/notes/:noteId
   * Get note content (fetch from S3).
   */
  @Get(':customerId/notes/:noteId')
  async getNote(
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const note = await this.prisma.customerNote.findUnique({
      where: { id: noteId },
    });
    if (!note || note.customerId !== customerId || note.ownerId !== ownerId) {
      throw new NotFoundException({
        error: 'NOTE_NOT_FOUND',
        message: '指定されたノートが見つかりません',
      });
    }

    // Fetch content from S3
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: note.s3Key,
      }),
    );
    const content = await response.Body?.transformToString('utf-8');

    return {
      noteId: note.id,
      customerId: note.customerId,
      category: note.category,
      title: note.title,
      noteDate: note.noteDate,
      content: content || '',
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  /**
   * PUT /api/customers/:customerId/notes/:noteId
   * Update note content (update S3).
   */
  @Put(':customerId/notes/:noteId')
  async updateNote(
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Body() body: { title?: string; content?: string; noteDate?: string },
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const note = await this.prisma.customerNote.findUnique({
      where: { id: noteId },
    });
    if (!note || note.customerId !== customerId || note.ownerId !== ownerId) {
      throw new NotFoundException({
        error: 'NOTE_NOT_FOUND',
        message: '指定されたノートが見つかりません',
      });
    }

    // Update S3 content if provided
    if (body.content !== undefined) {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: note.s3Key,
          Body: body.content,
          ContentType: 'text/plain; charset=utf-8',
        }),
      );
    }

    // Update DB metadata
    const updated = await this.prisma.customerNote.update({
      where: { id: noteId },
      data: {
        title: body.title ?? undefined,
        noteDate: body.noteDate !== undefined ? (body.noteDate || null) : undefined,
      },
    });

    return {
      noteId: updated.id,
      customerId: updated.customerId,
      category: updated.category,
      title: updated.title,
      noteDate: updated.noteDate,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * DELETE /api/customers/:customerId/notes/:noteId
   * Delete note (remove from DB + S3).
   */
  @Delete(':customerId/notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNote(
    @Param('customerId') customerId: string,
    @Param('noteId') noteId: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const note = await this.prisma.customerNote.findUnique({
      where: { id: noteId },
    });
    if (!note || note.customerId !== customerId || note.ownerId !== ownerId) {
      throw new NotFoundException({
        error: 'NOTE_NOT_FOUND',
        message: '指定されたノートが見つかりません',
      });
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: note.s3Key,
      }),
    );

    // Delete from DB
    await this.prisma.customerNote.delete({
      where: { id: noteId },
    });
  }

  // ---- Attachments ----

  /**
   * POST /api/customers/:customerId/attachments/presigned-url
   * Generate presigned PUT URL for direct upload to S3.
   */
  @Post(':customerId/attachments/presigned-url')
  async getPresignedUploadUrl(
    @Param('customerId') customerId: string,
    @Body()
    body: { fileName: string; fileType: string; category?: string; noteDate?: string },
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const attachmentId = randomUUID();
    const category = body.category || 'photo';
    const folder = category === 'attachment' ? 'attachments' : 'photos';
    const ext = body.fileName.split('.').pop() || 'bin';
    const s3Key = `${ownerId}/${customerId}/${folder}/${attachmentId}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: body.fileType,
    });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Save metadata to DB
    const attachment = await this.prisma.customerAttachment.create({
      data: {
        id: attachmentId,
        customerId,
        ownerId,
        fileName: body.fileName,
        fileType: body.fileType,
        s3Key,
        category,
        noteDate: body.noteDate || null,
      },
    });

    return {
      attachmentId: attachment.id,
      presignedUrl,
      s3Key,
    };
  }

  /**
   * GET /api/customers/:customerId/attachments
   * List attachments metadata.
   */
  @Get(':customerId/attachments')
  async listAttachments(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const attachments = await this.prisma.customerAttachment.findMany({
      where: { customerId, ownerId },
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
   * GET /api/customers/:customerId/attachments/:attachmentId/url
   * Generate presigned GET URL for downloading/viewing.
   */
  @Get(':customerId/attachments/:attachmentId/url')
  async getPresignedDownloadUrl(
    @Param('customerId') customerId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const attachment = await this.prisma.customerAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (
      !attachment ||
      attachment.customerId !== customerId ||
      attachment.ownerId !== ownerId
    ) {
      throw new NotFoundException({
        error: 'ATTACHMENT_NOT_FOUND',
        message: '指定された添付ファイルが見つかりません',
      });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: attachment.s3Key,
    });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return {
      attachmentId: attachment.id,
      presignedUrl,
    };
  }

  /**
   * DELETE /api/customers/:customerId/attachments/:attachmentId
   * Delete attachment (remove from DB + S3).
   */
  @Delete(':customerId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(
    @Param('customerId') customerId: string,
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    const ownerId = req.user.ownerId;
    await this.verifyOwnership(customerId, ownerId);

    const attachment = await this.prisma.customerAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (
      !attachment ||
      attachment.customerId !== customerId ||
      attachment.ownerId !== ownerId
    ) {
      throw new NotFoundException({
        error: 'ATTACHMENT_NOT_FOUND',
        message: '指定された添付ファイルが見つかりません',
      });
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: attachment.s3Key,
      }),
    );

    // Delete from DB
    await this.prisma.customerAttachment.delete({
      where: { id: attachmentId },
    });
  }
}
