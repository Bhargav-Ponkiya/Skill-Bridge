import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { MatchRequest } from './match-request.entity';
import { MatchService } from './match.service';
import { CreateMatchRequestInput } from './dto/create-match-request.input';
import { SuggestedMatch } from './dto/suggested-match.output';
import { PaginatedSuggestedMatches } from './dto/paginated-suggested-matches.output';
import { SuggestedMatchesFilterInput } from './dto/suggested-matches-filter.input';
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
    @CurrentUser() user: { id: string; sub?: string },
    @Args('type') type: 'sent' | 'received' | 'incoming',
    @Args('pagination', { nullable: true }) pagination?: PaginationInput,
  ): Promise<PaginatedMatchRequests> {
    return this.matchService.getMyRequests(
      (user.id || user.sub)!,
      type,
      pagination,
    );
  }

  @Query(() => [SuggestedMatch], {
    description:
      "Top ranked OFFER skills from other users that match the current user's WANTs.",
  })
  async suggestedMatches(
    @CurrentUser() user: { id: string; sub?: string },
  ): Promise<SuggestedMatch[]> {
    return this.matchService.getSuggestedMatches((user.id || user.sub)!);
  }

  @Query(() => PaginatedSuggestedMatches, {
    description:
      'Paginated and filterable suggested matches for the explore page.',
  })
  async suggestedMatchesExplore(
    @CurrentUser() user: { id: string; sub?: string },
    @Args('filter', { nullable: true }) filter?: SuggestedMatchesFilterInput,
  ): Promise<PaginatedSuggestedMatches> {
    return this.matchService.getSuggestedMatchesPaginated((user.id || user.sub)!, {
      page: filter?.page ?? 1,
      limit: filter?.limit ?? 20,
      category: filter?.category,
      search: filter?.search,
      minAffinity: filter?.minAffinity,
    });
  }

  @Mutation(() => MatchRequest)
  async sendMatchRequest(
    @CurrentUser() user: { id: string; sub?: string },
    @Args('input') input: CreateMatchRequestInput,
  ): Promise<MatchRequest> {
    return this.matchService.sendMatchRequest((user.id || user.sub)!, input);
  }

  @Mutation(() => MatchRequest)
  async respondToMatchRequest(
    @CurrentUser() user: { id: string; sub?: string },
    @Args('requestId') requestId: string,
    @Args('accept') accept: boolean,
  ): Promise<MatchRequest> {
    return this.matchService.respondToMatchRequest(
      (user.id || user.sub)!,
      requestId,
      accept,
    );
  }

  @Mutation(() => MatchRequest)
  async cancelMatchRequest(
    @CurrentUser() user: { id: string; sub?: string },
    @Args('requestId') requestId: string,
  ): Promise<MatchRequest> {
    return this.matchService.cancelMatchRequest((user.id || user.sub)!, requestId);
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
    return this.dataloaderService.skillLoader.load(request.offeredSkillId);
  }

  @ResolveField(() => Skill, { nullable: true })
  async wantedSkill(@Parent() request: MatchRequest): Promise<Skill | null> {
    if (!request.wantedSkillId) return null;
    return this.dataloaderService.skillLoader.load(request.wantedSkillId);
  }

  @ResolveField(() => Session, { nullable: true })
  async session(@Parent() request: MatchRequest): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { matchRequestId: request.id },
    });
  }
}
