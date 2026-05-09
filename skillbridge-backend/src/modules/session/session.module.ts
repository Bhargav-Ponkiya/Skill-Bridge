import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PubSub } from 'graphql-subscriptions';
import { Session } from './session.entity';
import { SessionService } from './session.service';
import { SessionResolver } from './session.resolver';
import { SessionSubscriptionResolver } from './session-subscription.resolver';
import { SessionConsumer } from './session.consumer';
import { SessionGateway } from './session.gateway';
import { MatchRequest } from '../match/match-request.entity';
import { Skill } from '../skill/skill.entity';
import { DataloaderModule } from '../dataloader/dataloader.module';

import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiModule } from '../ai/ai.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Session, MatchRequest, Skill]),
    DataloaderModule,
    AiModule,
    NotificationModule,
    AuthModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'skillbridge.exchange',
            type: 'topic',
          },
        ],
        uri:
          configService.get<string>('rabbitmq.url') ||
          'amqp://guest:guest@localhost:5672',
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    SessionService,
    SessionResolver,
    SessionSubscriptionResolver,
    SessionConsumer,
    SessionGateway,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
  exports: [SessionService],
})
export class SessionModule {}
