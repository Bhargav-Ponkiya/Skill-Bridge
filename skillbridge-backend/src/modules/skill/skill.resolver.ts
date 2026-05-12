import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Skill } from './skill.entity';
import { User } from '../user/user.entity';
import { SkillService } from './skill.service';
import { DataloaderService } from '../dataloader/dataloader.service';
import { CreateSkillInput } from './dto/create-skill.input';
import { UpdateSkillInput } from './dto/update-skill.input';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Portfolio } from './portfolio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginatedSkills } from './dto/paginated-skills.output';
import { CursorPaginationInput } from '../../common/dto/cursor-pagination.input';
import { Public } from '../../common/decorators/public.decorator';
import { AddPortfolioInput } from './dto/add-portfolio.input';
import { UpdatePortfolioInput } from './dto/update-portfolio.input';

@Resolver(() => Skill)
export class SkillResolver {
  constructor(
    private readonly skillService: SkillService,
    private readonly dataloaderService: DataloaderService,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
  ) {}

  @Public()
  @Query(() => PaginatedSkills, {
    description:
      'Search active skills offered by other users (excludes the current user).',
  })
  async searchSkills(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('query', { nullable: true }) query?: string,
    @Args('category', { nullable: true }) category?: string,
    @Args('type', { nullable: true }) type?: string,
    @Args('pagination', { nullable: true }) pagination?: CursorPaginationInput,
  ): Promise<PaginatedSkills> {
    return this.skillService.searchSkills(
      user?.id || user?.sub || null,
      query,
      category,
      type,
      pagination,
    );
  }

  @Query(() => [Skill])
  async mySkills(
    @CurrentUser() user: { id: string; sub?: string },
  ): Promise<Skill[]> {
    return this.skillService.mySkills((user.id || user.sub)!);
  }

  @Mutation(() => Skill)
  async addSkill(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('input') input: CreateSkillInput,
  ): Promise<Skill> {
    return this.skillService.createSkill((user?.id || user?.sub)!, input);
  }

  @Mutation(() => Skill)
  async updateSkill(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('id') id: string,
    @Args('input') input: UpdateSkillInput,
  ): Promise<Skill> {
    return this.skillService.updateSkill((user?.id || user?.sub)!, id, input);
  }

  @Mutation(() => Skill)
  async toggleSkillActive(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('id') id: string,
  ): Promise<Skill> {
    return this.skillService.toggleSkillActive((user?.id || user?.sub)!, id);
  }

  @Mutation(() => Boolean)
  async deleteSkill(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.skillService.deleteSkill((user?.id || user?.sub)!, id);
  }

  @Mutation(() => Portfolio)
  async addPortfolio(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('input') input: AddPortfolioInput,
  ): Promise<Portfolio> {
    return this.skillService.addPortfolio((user?.id || user?.sub)!, input);
  }

  @Mutation(() => Boolean)
  async removePortfolio(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.skillService.removePortfolio((user?.id || user?.sub)!, id);
  }

  @Mutation(() => Portfolio)
  async updatePortfolio(
    @CurrentUser() user: { id: string; sub?: string } | null,
    @Args('id') id: string,
    @Args('input') input: UpdatePortfolioInput,
  ): Promise<Portfolio> {
    return this.skillService.updatePortfolio((user?.id || user?.sub)!, id, input);
  }

  @ResolveField(() => User, { nullable: true })
  async user(@Parent() skill: Skill): Promise<User | null> {
    if (!skill.userId) return null;
    return this.dataloaderService.userLoader.load(skill.userId);
  }

  @ResolveField(() => [Portfolio])
  async portfolios(@Parent() skill: Skill): Promise<Portfolio[]> {
    return this.portfolioRepository.find({ where: { skillId: skill.id } });
  }
}
