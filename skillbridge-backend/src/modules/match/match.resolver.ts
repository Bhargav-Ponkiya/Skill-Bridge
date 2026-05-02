import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { MatchRequest } from './match-request.entity';
import { MatchService } from './match.service';
import { CreateMatchRequestInput } from './dto/create-match-request.input';
import { SuggestedMatch } from './dto/suggested-match.output';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DataloaderService } from '../dataloader/dataloader.service';
import { User } from '../user/user.entity';
import { Skill } from '../skill/skill.entity';
import { Session } from '../session/session.entity';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { PaginatedMatchRequests } from './dto/paginated-match-requests.output';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Resolver(() => MatchRequest)
export class MatchResolver {
  constructor(
    private readonly matchService: MatchService,
    private readonly dataloaderService: DataloaderService,
    @InjectRepository(Skill)
    private readonly skillRepository: Repository<Skill>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  @Query(() => PaginatedMatchRequests)
  async myMatchRequests(
    @CurrentUser() user: any,
    @Args('type') type: 'sent' | 'received' | 'incoming',
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<PaginatedMatchRequests> {
    return this.matchService.getMyRequests(user.id || user.sub, type, pagination);
  }

  @Query(() => [SuggestedMatch], {
    description: 'Ranked OFFER skills from other users that match the current user\'s WANTs, scored 0-100.',
  })
  async suggestedMatches(@CurrentUser() user: any): Promise<SuggestedMatch[]> {
    return this.matchService.getSuggestedMatches(user.id || user.sub);
  }

  @Mutation(() => MatchRequest)
  async sendMatchRequest(
    @CurrentUser() user: any,
    @Args('input') input: CreateMatchRequestInput,
  ): Promise<MatchRequest> {
    return this.matchService.sendMatchRequest(user.id || user.sub, input);
  }

  @Mutation(() => MatchRequest)
  async respondToMatchRequest(
    @CurrentUser() user: any,
    @Args('requestId') requestId: string,
    @Args('accept') accept: boolean,
  ): Promise<MatchRequest> {
    return this.matchService.respondToMatchRequest(user.id || user.sub, requestId, accept);
  }

  @ResolveField(() => User, { nullable: true })
  async fromUser(@Parent() request: MatchRequest): Promise<User | null> {
    if (!request.fromUserId) return null;
    return this.dataloaderService.userLoader.load(request.fromUserId);
  }

  @ResolveField(() => User, { nullable: true })
  async toUser(@Parent() request: MatchRequest): Promise<User | null> {
    if (!request.toUserId) return null;
    return this.dataloaderService.userLoader.load(request.toUserId);
  }

  @ResolveField(() => Skill, { nullable: true })
  async offeredSkill(@Parent() request: MatchRequest): Promise<Skill | null> {
    if (!request.offeredSkillId) return null;
    return this.skillRepository.findOne({ where: { id: request.offeredSkillId } });
  }

  @ResolveField(() => Skill, { nullable: true })
  async wantedSkill(@Parent() request: MatchRequest): Promise<Skill | null> {
    if (!request.wantedSkillId) return null;
    return this.skillRepository.findOne({ where: { id: request.wantedSkillId } });
  }

  @ResolveField(() => Session, { nullable: true })
  async session(@Parent() request: MatchRequest): Promise<Session | null> {
    return this.sessionRepository.findOne({ where: { matchRequestId: request.id } });
  }
}
