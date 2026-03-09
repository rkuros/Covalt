import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleCalendarApiClient,
  CalendarListEntry,
} from '../domain/GoogleCalendarApiClient';
import { CalendarEventDetail } from '../domain/CalendarEventDetail';

/**
 * Google Calendar API Gateway の仮実装。
 * 本番では Google Calendar API を呼び出す。現時点では console.log で代替する。
 */
// TODO: Replace stub with actual Google API integration
@Injectable()
export class GoogleCalendarApiGatewayImpl implements GoogleCalendarApiClient {
  private readonly logger = new Logger(GoogleCalendarApiGatewayImpl.name);

  // TODO: Replace stub with actual Google API integration
  async listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
    this.logger.log('[Google Calendar API] listCalendars called', {
      accessToken: accessToken.substring(0, 8) + '...',
    });

    // Stub response
    return [
      { id: 'primary', summary: 'Primary Calendar', primary: true },
      { id: 'work@gmail.com', summary: 'Work Calendar', primary: false },
    ];
  }

  // TODO: Replace stub with actual Google API integration
  async createEvent(
    accessToken: string,
    calendarId: string,
    eventDetail: CalendarEventDetail,
  ): Promise<string> {
    const googleEventId = `gcal_evt_${Date.now()}`;
    this.logger.log('[Google Calendar API] createEvent called', {
      accessToken: accessToken.substring(0, 8) + '...',
      calendarId,
      title: eventDetail.title,
      startDateTime: eventDetail.startDateTime.toISOString(),
      endDateTime: eventDetail.endDateTime.toISOString(),
      googleEventId,
    });
    return googleEventId;
  }

  // TODO: Replace stub with actual Google API integration
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    eventDetail: CalendarEventDetail,
  ): Promise<void> {
    this.logger.log('[Google Calendar API] updateEvent called', {
      accessToken: accessToken.substring(0, 8) + '...',
      calendarId,
      eventId,
      title: eventDetail.title,
      startDateTime: eventDetail.startDateTime.toISOString(),
      endDateTime: eventDetail.endDateTime.toISOString(),
    });
  }

  // TODO: Replace stub with actual Google API integration
  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    this.logger.log('[Google Calendar API] deleteEvent called', {
      accessToken: accessToken.substring(0, 8) + '...',
      calendarId,
      eventId,
    });
  }
}
