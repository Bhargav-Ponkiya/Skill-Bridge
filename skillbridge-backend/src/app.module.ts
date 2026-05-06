import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import * as Joi from 'joi';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';

import { appConfig } from './config/app.config';
import { redisConfig } from './config/redis.config';
import { rabbitmqConfig } from './config/rabbitmq.config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { SkillModule } from './modules/skill/skill.module';
import { MatchModule } from './modules/match/match.module';
import { SessionModule } from './modules/session/session.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AiModule } from './modules/ai/ai.module';
import { DataloaderModule } from './modules/dataloader/dataloader.module';
import { CacheModule } from './modules/cache/cache.module';
import { MessageModule } from './modules/message/message.module';
import { ReviewModule } from './modules/review/review.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './modules/cache/rate-limit.guard';

@Module({
  imports: [
    // ────────────── Throttler ──────────────
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 50 }]),

    // ────────────── Config ──────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig, rabbitmqConfig],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3001),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        RABBITMQ_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        GEMINI_API_KEY: Joi.string().required(),
        FRONTEND_URL: Joi.string().default('http://localhost:3000'),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),

    // ────────────── Database ──────────────
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: false,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      logging: false,
    }),

    // ────────────── GraphQL ──────────────
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      formatError: (error) => {
        return {
          message: error.message,
          code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
        };
      },
      subscriptions: {
        'graphql-ws': true,
      },
      context: ({ req, res, connectionParams }: any) => {
        const ctxReq = req || { headers: {} };
        if (connectionParams) {
          const normalizedHeaders = Object.keys(connectionParams).reduce((acc, key) => {
            acc[key.toLowerCase()] = connectionParams[key];
            return acc;
          }, {} as any);
          ctxReq.headers = { ...ctxReq.headers, ...normalizedHeaders };
          ctxReq.connectionParams = connectionParams;
          // Passport strategies often use req.get('header-name')
          if (!ctxReq.get) {
            ctxReq.get = function(name: string) { return this.headers[name.toLowerCase()]; };
          }
        }
        return { req: ctxReq, res };
      },
    }),
    HealthModule,
    AuthModule,
    UserModule,
    SkillModule,
    MatchModule,
    SessionModule,
    NotificationModule,
    AiModule,
    DataloaderModule,
    CacheModule,
    MessageModule,
    ReviewModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
