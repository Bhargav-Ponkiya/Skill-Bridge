import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PubSub } from 'graphql-subscriptions';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { NotificationConsumer } from './notification.consumer';

import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: 'skillbridge.exchange',
            type: 'topic',
          },
        ],
        uri: configService.get<string>('rabbitmq.url') || 'amqp://guest:guest@localhost:5672',
        connectionInitOptions: { wait: false },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    NotificationService,
    NotificationResolver,
    NotificationConsumer,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
