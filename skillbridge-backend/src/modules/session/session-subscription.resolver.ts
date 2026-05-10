import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Session } from './session.entity';
import { Public } from '../../common/decorators/public.decorator';

@Resolver(() => Session)
export class SessionSubscriptionResolver {
  constructor(@Inject('PUB_SUB') private readonly pubSub: PubSub) {}

  @Public()
  @Subscription(() => Session, {
    filter: (payload: any, variables: any) =>
      payload.sessionUpdated.id === variables.sessionId,
  })
  sessionUpdated(@Args('sessionId') _sessionId: string) {
    return this.pubSub.asyncIterableIterator('sessionUpdated');
  }
}
