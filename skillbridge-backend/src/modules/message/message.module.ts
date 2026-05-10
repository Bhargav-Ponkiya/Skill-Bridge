import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './message.entity';
import { Session } from '../session/session.entity';
import { User } from '../user/user.entity';
import { MessageService } from './message.service';
import { MessageResolver } from './message.resolver';
import { MessageSubscriptionResolver } from './message-subscription.resolver';
import { DataloaderModule } from '../dataloader/dataloader.module';

import { PubSub } from 'graphql-subscriptions';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Session, User]),
    DataloaderModule,
  ],
  providers: [
    MessageService,
    MessageResolver,
    MessageSubscriptionResolver,
    {
      provide: 'PUB_SUB',
      useValue: new PubSub(),
    },
  ],
  exports: [MessageService],
})
export class MessageModule {}
