import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Int,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { Message } from './message.entity';
import { MessageService } from './message.service';
import { CreateMessageInput } from './dto/create-message.input';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { DataloaderService } from '../dataloader/dataloader.service';

@Resolver(() => Message)
export class MessageResolver {
  constructor(
    private readonly messageService: MessageService,
    private readonly dataloaderService: DataloaderService,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  @Query(() => [Message])
  async messages(
    @CurrentUser() user: { id?: string; sub?: string },
    @Args('sessionId') sessionId: string,
    @Args('limit', { type: () => Int, nullable: true })
    limit?: number,
    @Args('offset', { type: () => Int, nullable: true })
    offset?: number,
  ): Promise<Message[]> {
    return this.messageService.getMessagesBySession(
      sessionId,
      user.id || user.sub,
      limit,
      offset,
    );
  }

  @Mutation(() => Message)
  async sendMessage(
    @CurrentUser() user: { id?: string; sub?: string; name?: string },
    @Args('input') input: CreateMessageInput,
  ): Promise<Message> {
    const userId = (user.id || user.sub)!;
    const message = await this.messageService.createMessage(userId, input);
    await this.pubSub.publish('messageAdded', { messageAdded: message });
    // Sending a message implicitly stops the "is typing…" indicator for this user.
    await this.pubSub.publish('typingChanged', {
      typingChanged: {
        sessionId: input.sessionId,
        userId,
        userName: user.name,
        isTyping: false,
      },
    });
    return message;
  }

  @Mutation(() => Boolean)
  async setTyping(
    @CurrentUser() user: { id?: string; sub?: string; name?: string },
    @Args('sessionId') sessionId: string,
    @Args('isTyping') isTyping: boolean,
  ): Promise<boolean> {
    const userId = (user.id || user.sub)!;
    await this.pubSub.publish('typingChanged', {
      typingChanged: {
        sessionId,
        userId,
        userName: user.name,
        isTyping,
      },
    });
    return true;
  }

  @Mutation(() => Int)
  async markSessionRead(
    @CurrentUser() user: { id?: string; sub?: string },
    @Args('sessionId') sessionId: string,
  ): Promise<number> {
    return this.messageService.markSessionRead(
      sessionId,
      (user.id || user.sub)!,
    );
  }

  @ResolveField(() => User, { nullable: true })
  async sender(@Parent() message: Message): Promise<User | null> {
    if (!message.senderId) return null;
    return this.dataloaderService.userLoader.load(message.senderId);
  }
}
