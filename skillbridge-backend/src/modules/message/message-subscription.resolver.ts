import { Resolver, Subscription } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Message } from './message.entity';
import { TypingEvent } from './dto/typing-event.output';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Resolver(() => Message)
@UseGuards(JwtAuthGuard)
export class MessageSubscriptionResolver {
  constructor(@Inject('PUB_SUB') private readonly pubSub: PubSub) {}

  @Subscription(() => Message, {
    filter: (
      payload: { messageAdded: Message },
      variables: { sessionId: string },
    ) => payload.messageAdded.sessionId === variables.sessionId,
  })
  messageAdded() {
    return this.pubSub.asyncIterableIterator('messageAdded');
  }

  @Subscription(() => TypingEvent, {
    filter: (
      payload: { typingChanged: TypingEvent },
      variables: { sessionId: string },
    ) => payload.typingChanged.sessionId === variables.sessionId,
  })
  typingChanged() {
    return this.pubSub.asyncIterableIterator('typingChanged');
  }
}
