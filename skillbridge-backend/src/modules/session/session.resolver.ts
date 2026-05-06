import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { Session, SessionStatus } from './session.entity';
import { SessionService } from './session.service';
import { UpdateSessionInput } from './dto/update-session.input';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataloaderService } from '../dataloader/dataloader.service';
import { User } from '../user/user.entity';
import { Skill } from '../skill/skill.entity';

@Resolver(() => Session)
export class SessionResolver {
  constructor(
    private readonly sessionService: SessionService,
    private readonly dataloaderService: DataloaderService,
  ) {}

  @Query(() => [Session])
  async mySessions(@CurrentUser() user: any): Promise<Session[]> {
    return this.sessionService.getMySessions(user.id || user.sub);
  }

  @Query(() => Session)
  async session(
    @CurrentUser() user: any,
    @Args('id') id: string,
  ): Promise<Session> {
    return this.sessionService.getSession(user.id || user.sub, id);
  }

  @Mutation(() => Session)
  async updateSession(
    @CurrentUser() user: any,
    @Args('id') id: string,
    @Args('input') input: UpdateSessionInput,
  ): Promise<Session> {
    return this.sessionService.updateSessionDetails(user.id || user.sub, id, input);
  }

  @Mutation(() => Session)
  async changeSessionStatus(
    @CurrentUser() user: any,
    @Args('id') id: string,
    @Args('status', { type: () => SessionStatus }) status: SessionStatus,
  ): Promise<Session> {
    return this.sessionService.advanceSessionStatus(user.id || user.sub, id, status);
  }

  @Mutation(() => Session)
  async toggleSessionProgress(
    @CurrentUser() user: any,
    @Args('id') id: string,
  ): Promise<Session> {
    return this.sessionService.toggleSessionProgress(user.id || user.sub, id);
  }

  @Mutation(() => Session)
  async cancelSession(
    @CurrentUser() user: any,
    @Args('id') id: string,
    @Args('reason', { nullable: true }) reason?: string,
  ): Promise<Session> {
    return this.sessionService.cancelSession(user.id || user.sub, id, reason ?? '');
  }

  @ResolveField(() => User)
  async participant1(@Parent() session: Session): Promise<User> {
    return this.dataloaderService.userLoader.load(session.participant1Id);
  }

  @ResolveField(() => User)
  async participant2(@Parent() session: Session): Promise<User> {
    return this.dataloaderService.userLoader.load(session.participant2Id);
  }

  @ResolveField(() => Skill)
  async skill1(@Parent() session: Session): Promise<Skill> {
    return this.dataloaderService.skillLoader.load(session.skill1Id);
  }

  @ResolveField(() => Skill)
  async skill2(@Parent() session: Session): Promise<Skill> {
    return this.dataloaderService.skillLoader.load(session.skill2Id);
  }
}
