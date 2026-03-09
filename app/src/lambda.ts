import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

let cachedServer: ReturnType<typeof serverlessExpress>;

async function bootstrap() {
  if (cachedServer) return cachedServer;

  const expressApp = express();
  // Preserve raw body for webhook signature verification
  expressApp.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      bodyParser: false,
    },
  );
  app.enableCors({ origin: true });
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.init();

  cachedServer = serverlessExpress({ app: expressApp });
  return cachedServer;
}

export const handler = async (
  event: unknown,
  context: unknown,
  callback: unknown,
) => {
  const server = await bootstrap();
  return server(event, context, callback);
};
