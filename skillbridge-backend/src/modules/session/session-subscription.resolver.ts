import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Session } from './session.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Resolver(() => Session)
@UseGuards(JwtAuthGuard)
export class SessionSubscriptionResolver {
  constructor(@Inject('PUB_SUB') private readonly pubSub: PubSub) {}

  @Subscription(() => Session, {
    filter: (payload: any, variables: any) =>
      payload.sessionUpdated.id === variables.sessionId,
  })
  sessionUpdated(@Args('sessionId') _sessionId: string) {
    return this.pubSub.asyncIterableIterator('sessionUpdated');
  }
}
