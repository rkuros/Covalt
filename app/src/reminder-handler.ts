import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AppModule } from './app.module';
import { ReminderCronService } from './unit5-notification/cron/reminder.cron';

let cachedApp: INestApplicationContext;

async function getApp(): Promise<INestApplicationContext> {
  if (cachedApp) return cachedApp;
  cachedApp = await NestFactory.createApplicationContext(AppModule);
  return cachedApp;
}

export const handler = async () => {
  const app = await getApp();
  const reminderService = app.get(ReminderCronService);
  await reminderService.handleReminders();
  return { statusCode: 200, body: 'OK' };
};
