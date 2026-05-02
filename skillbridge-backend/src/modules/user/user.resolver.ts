import { Resolver, Query, Mutation, Args, ResolveField, Parent, Context, Float, Int } from '@nestjs/graphql';
import { Inject, forwardRef } from '@nestjs/common';
import { User } from './user.entity';
import { Skill } from '../skill/skill.entity';
import { SkillService } from '../skill/skill.service';
import { UserService } from './user.service';
import { UpdateProfileInput } from './dto/update-profile.input';
import { UserStats } from './dto/user-stats.output';
import { AvailabilitySlot, AvailabilitySlotInput } from './dto/availability-slot';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => SkillService))
    private readonly skillService: SkillService,
  ) {}

  @Query(() => User)
  async me(@CurrentUser() user: any): Promise<User> {
    return this.userService.findById(user.id || user.sub);
  }

  @Query(() => User, {
    description: 'Look up a user by username (email local-part or display name) for the public profile page.',
  })
  async userByUsername(@Args('identifier') identifier: string): Promise<User> {
    return this.userService.findByUsernameOrEmail(identifier);
  }

  @Query(() => UserStats, {
    description: 'Aggregate trust + activity signals for the given user.',
  })
  async userStats(@Args('userId') userId: string): Promise<UserStats> {
    return this.userService.getUserStats(userId);
  }

  @Mutation(() => User)
  async updateProfile(
    @CurrentUser() user: any,
    @Args('input') input: UpdateProfileInput,
  ): Promise<User> {
    return this.userService.updateProfile(user.id || user.sub, input);
  }

  @Mutation(() => [AvailabilitySlot])
  async setAvailability(
    @CurrentUser() user: any,
    @Args({ name: 'slots', type: () => [AvailabilitySlotInput] })
    slots: AvailabilitySlotInput[],
  ): Promise<AvailabilitySlot[]> {
    return this.userService.setAvailability(user.id || user.sub, slots);
  }

  /**
   * The owner sees all their skills (active + inactive). Anyone else only sees active skills.
   */
  @ResolveField(() => [Skill])
  async skills(
    @Parent() user: User,
    @Context() ctx: any,
  ): Promise<Skill[]> {
    const requesterId: string | undefined = ctx?.req?.user?.id || ctx?.req?.user?.sub;
    const all = await this.skillService.findSkillsByUserId(user.id);
    if (requesterId && requesterId === user.id) return all;
    return all.filter((s) => s.isActive);
  }

  @ResolveField(() => Float)
  async trustScore(@Parent() user: User): Promise<number> {
    const stats = await this.userService.getUserStats(user.id);
    return stats.trustScore;
  }

  @ResolveField(() => Int)
  async reviewCount(@Parent() user: User): Promise<number> {
    const stats = await this.userService.getUserStats(user.id);
    return stats.reviewCount;
  }
}
