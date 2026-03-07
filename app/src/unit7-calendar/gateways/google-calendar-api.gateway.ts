import { Injectable } from '@nestjs/common';
import {
  GoogleCalendarApiClient,
  CalendarListEntry,
} from '../domain/GoogleCalendarApiClient';
import { CalendarEventDetail } from '../domain/CalendarEventDetail';

/**
 * Google Calendar API Gateway の仮実装。
 * 本番では Google Calendar API を呼び出す。現時点では console.log で代替する。
 */
@Injectable()
export class GoogleCalendarApiGatewayImpl implements GoogleCalendarApiClient {
  async listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
    console.log('[Google Calendar API] listCalendars called', {
      accessToken: accessToken.substring(0, 8) + '...',
    });

    // Stub response
    return [
      { id: 'primary', summary: 'Primary Calendar', primary: true },
      { id: 'work@gmail.com', summary: 'Work Calendar', primary: false },
    ];
  }

  async createEvent(
    accessToken: string,
    calendarId: string,
    eventDetail: CalendarEventDetail,
  ): Promise<string> {
    const googleEventId = `gcal_evt_${Date.now()}`;
    console.log('[Google Calendar API] createEvent called', {
      accessToken: accessToken.substring(0, 8) + '...',
      calendarId,
      title: eventDetail.title,
      startDateTime: eventDetail.startDateTime.toISOString(),
      endDateTime: eventDetail.endDateTime.toISOString(),
      googleEventId,
    });
    return googleEventId;
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    eventDetail: CalendarEventDetail,
  ): Promise<void> {
    console.log('[Google Calendar API] updateEvent called', {
      accessToken: accessToken.substring(0, 8) + '...',
      calendarId,
      eventId,
      title: eventDetail.title,
      startDateTime: eventDetail.startDateTime.toISOString(),
      endDateTime: eventDetail.endDateTime.toISOString(),
    });
  }

  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<void> {
    console.log('[Google Calendar API] deleteEvent called', {
      accessToken: accessToken.substring(0, 8) + '...',
      calendarId,
      eventId,
    });
  }
}
