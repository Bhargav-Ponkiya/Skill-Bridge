import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  Int,
} from '@nestjs/graphql';
import { Max, Min } from 'class-validator';
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
    @CurrentUser() user: any,
    @Args('sessionId') sessionId: string,
    @Args('limit', { type: () => Int, nullable: true })
    @Max(500)
    limit?: number,
    @Args('offset', { type: () => Int, nullable: true })
    @Min(0)
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
    @CurrentUser() user: any,
    @Args('input') input: CreateMessageInput,
  ): Promise<Message> {
    const message = await this.messageService.createMessage(
      user.id || user.sub,
      input,
    );
    this.pubSub.publish('messageAdded', { messageAdded: message });
    // Sending a message implicitly stops the "is typing…" indicator for this user.
    this.pubSub.publish('typingChanged', {
      typingChanged: {
        sessionId: input.sessionId,
        userId: user.id || user.sub,
        userName: user.name,
        isTyping: false,
      },
    });
    return message;
  }

  @Mutation(() => Boolean)
  async setTyping(
    @CurrentUser() user: any,
    @Args('sessionId') sessionId: string,
    @Args('isTyping') isTyping: boolean,
  ): Promise<boolean> {
    this.pubSub.publish('typingChanged', {
      typingChanged: {
        sessionId,
        userId: user.id || user.sub,
        userName: user.name,
        isTyping,
      },
    });
    return true;
  }

  @Mutation(() => Int)
  async markSessionRead(
    @CurrentUser() user: any,
    @Args('sessionId') sessionId: string,
  ): Promise<number> {
    return this.messageService.markSessionRead(sessionId, user.id || user.sub);
  }

  @ResolveField(() => User, { nullable: true })
  async sender(@Parent() message: Message): Promise<User | null> {
    if (!message.senderId) return null;
    return this.dataloaderService.userLoader.load(message.senderId);
  }
}
