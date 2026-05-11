import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { GqlExceptionFilter } from './common/filters/gql-exception.filter';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3001;
  const frontendUrl =
    config.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  const redisUrl = config.get<string>('redis.url') ?? 'redis://localhost:6379';

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(redisUrl);
  app.useWebSocketAdapter(redisIoAdapter);

  // ── Security & Utilities ──
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // handled by frontend
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // ── CORS ──
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow local development
      if (!origin || origin.includes('localhost')) {
        return callback(null, true);
      }
      // Allow the configured frontend URL
      if (origin === frontendUrl) {
        return callback(null, true);
      }
      // Allow any Vercel deployment for this user
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'apollo-require-preflight'],
  });

  // ── Global Validation Pipe ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Filters ──
  app.useGlobalFilters(new GqlExceptionFilter());

  // ── Shutdown hooks ──
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`🚀 SkillBridge backend running on: http://localhost:${port}`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
