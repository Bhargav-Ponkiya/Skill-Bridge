import { Resolver, Subscription } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Session } from './session.entity';
import { Public } from '../../common/decorators/public.decorator';

@Resolver(() => Session)
export class SessionSubscriptionResolver {
  constructor(@Inject('PUB_SUB') private readonly pubSub: PubSub) {}

  @Public()
  @Subscription(() => Session, {
    filter: (
      payload: { sessionUpdated: Session },
      variables: { sessionId: string },
    ) => payload.sessionUpdated.id === variables.sessionId,
  })
  sessionUpdated() {
    return this.pubSub.asyncIterableIterator('sessionUpdated');
  }
}
