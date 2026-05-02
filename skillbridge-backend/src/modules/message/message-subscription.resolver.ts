import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Message } from './message.entity';
import { TypingEvent } from './dto/typing-event.output';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Resolver(() => Message)
@UseGuards(JwtAuthGuard)
export class MessageSubscriptionResolver {
  constructor(
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  @Subscription(() => Message, {
    filter: (payload: any, variables: any) => payload.messageAdded.sessionId === variables.sessionId,
  })
  messageAdded(@Args('sessionId') _sessionId: string) {
    return this.pubSub.asyncIterableIterator('messageAdded');
  }

  @Subscription(() => TypingEvent, {
    filter: (payload: any, variables: any) =>
      payload.typingChanged.sessionId === variables.sessionId,
  })
  typingChanged(@Args('sessionId') _sessionId: string) {
    return this.pubSub.asyncIterableIterator('typingChanged');
  }
}
