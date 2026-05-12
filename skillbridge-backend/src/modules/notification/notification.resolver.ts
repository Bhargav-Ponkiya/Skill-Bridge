import { Resolver, Query, Mutation, Args, Subscription } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PubSub } from 'graphql-subscriptions';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject('PUB_SUB') private pubSub: PubSub,
  ) {}

  @Query(() => [Notification])
  async myNotifications(
    @CurrentUser() user: { id?: string; sub?: string },
  ): Promise<Notification[]> {
    return this.notificationService.findMyNotifications((user.id || user.sub)!);
  }

  @Mutation(() => Notification)
  async markNotificationRead(
    @CurrentUser() user: { id?: string; sub?: string },
    @Args('id') id: string,
  ): Promise<Notification> {
    return this.notificationService.markAsRead(id, (user.id || user.sub)!);
  }

  @Subscription(() => Notification, {
    filter: (
      payload: { onNotification: Notification },
      variables: { userId: string },
    ) => {
      // payload data structure from PubSub publish: payload.onNotification
      return payload.onNotification.userId === variables.userId;
    },
  })
  onNotification(@Args('userId') userId: string) {
    // Note: We use dynamic subscription tags to scale across different user streams efficiently.
    return this.pubSub.asyncIterableIterator(`notificationData_${userId}`);
  }
}
