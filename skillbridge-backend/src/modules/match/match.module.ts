import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PubSub } from 'graphql-subscriptions';
import { MatchRequest } from './match-request.entity';
import { MatchService } from './match.service';
import { MatchResolver } from './match.resolver';
import { MatchSubscriptionResolver } from './match-subscription.resolver';
import { MatchConsumer } from './match.consumer';
import { DataloaderModule } from '../dataloader/dataloader.module';
import { Skill } from '../skill/skill.entity';
import { Session } from '../session/session.entity';
import { User } from '../user/user.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([MatchRequest, Skill, Session, User]),
    DataloaderModule,
    NotificationModule,
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
    MatchService,
    MatchResolver,
    MatchSubscriptionResolver,
    MatchConsumer,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
  exports: [MatchService],
})
export class MatchModule {}
