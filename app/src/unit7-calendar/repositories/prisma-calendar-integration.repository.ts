import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  GoogleCalendarIntegration,
  IntegrationStatus,
} from '../domain/GoogleCalendarIntegration';
import { GoogleCalendarIntegrationRepository } from '../domain/GoogleCalendarIntegrationRepository';
import { OAuthToken } from '../domain/OAuthToken';
import { CalendarId } from '../domain/CalendarId';

@Injectable()
export class PrismaCalendarIntegrationRepository implements GoogleCalendarIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<GoogleCalendarIntegration | null> {
    const row = await this.prisma.googleCalendarIntegration.findUnique({
      where: { ownerId: id },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async findByOwnerId(
    ownerId: string,
  ): Promise<GoogleCalendarIntegration | null> {
    const row = await this.prisma.googleCalendarIntegration.findUnique({
      where: { ownerId },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async save(integration: GoogleCalendarIntegration): Promise<void> {
    const token = integration.oauthToken;
    await this.prisma.googleCalendarIntegration.upsert({
      where: { ownerId: integration.ownerId },
      create: {
        ownerId: integration.ownerId,
        accessToken: token?.accessToken ?? null,
        refreshToken: token?.refreshToken ?? null,
        tokenExpiresAt: token?.expiresAt ?? null,
        calendarId: integration.calendarId?.value ?? null,
        status: integration.status,
      },
      update: {
        accessToken: token?.accessToken ?? null,
        refreshToken: token?.refreshToken ?? null,
        tokenExpiresAt: token?.expiresAt ?? null,
        calendarId: integration.calendarId?.value ?? null,
        status: integration.status,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.googleCalendarIntegration.delete({
      where: { ownerId: id },
    });
  }

  private toDomain(row: {
    ownerId: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    calendarId: string | null;
    status: string;
  }): GoogleCalendarIntegration {
    const oauthToken =
      row.accessToken && row.refreshToken && row.tokenExpiresAt
        ? OAuthToken.create(
            row.accessToken,
            row.refreshToken,
            row.tokenExpiresAt,
          )
        : null;

    const calendarId = row.calendarId
      ? CalendarId.create(row.calendarId)
      : null;

    // Map DB status to domain IntegrationStatus
    let status: IntegrationStatus;
    switch (row.status) {
      case 'active':
        status = 'active';
        break;
      case 'requires_reauth':
        status = 'requires_reauth';
        break;
      default:
        status = 'inactive';
        break;
    }

    // The DB schema (google_calendar_integrations) does not have createdAt/updatedAt columns.
    // The domain model carries these as in-memory fields for tracking mutations within a
    // single lifecycle. We pass new Date() as placeholders since no persisted values exist.
    return GoogleCalendarIntegration.reconstruct(
      row.ownerId,
      row.ownerId,
      oauthToken,
      calendarId,
      status,
      new Date(),
      new Date(),
    );
  }
}
