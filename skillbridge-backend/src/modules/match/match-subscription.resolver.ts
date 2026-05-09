import { Resolver, Subscription, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { MatchRequest } from './match-request.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Resolver(() => MatchRequest)
@UseGuards(JwtAuthGuard)
export class MatchSubscriptionResolver {
  constructor(@Inject('PUB_SUB') private readonly pubSub: PubSub) {}

  /**
   * Fires whenever a request the user is part of (as sender or recipient) changes status.
   * The frontend subscribes with its own userId; the filter ensures we only deliver
   * payloads where this user is on one side of the request.
   */
  @Subscription(() => MatchRequest, {
    filter: (payload: any, variables: any) => {
      const r = payload.matchRequestUpdated;
      return (
        r.fromUserId === variables.userId || r.toUserId === variables.userId
      );
    },
  })
  matchRequestUpdated(@Args('userId') _userId: string) {
    return this.pubSub.asyncIterableIterator('matchRequestUpdated');
  }
}
