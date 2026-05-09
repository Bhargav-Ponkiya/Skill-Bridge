import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { Review } from './review.entity';
import { ReviewService } from './review.service';
import { CreateReviewInput } from './dto/create-review.input';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../user/user.entity';
import { Skill } from '../skill/skill.entity';
import { DataloaderService } from '../dataloader/dataloader.service';

@Resolver(() => Review)
export class ReviewResolver {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly dataloaderService: DataloaderService,
  ) {}

  @Public()
  @Query(() => [Review])
  async userReviews(@Args('userId') userId: string): Promise<Review[]> {
    return this.reviewService.getReviewsForUser(userId);
  }

  @Public()
  @Query(() => [Review])
  async skillReviews(
    @Args('userId') userId: string,
    @Args('skillId') skillId: string,
  ): Promise<Review[]> {
    return this.reviewService.getReviewsForUserAndSkill(userId, skillId);
  }

  @Mutation(() => Review)
  async createReview(
    @CurrentUser() user: any,
    @Args('input') input: CreateReviewInput,
  ): Promise<Review> {
    return this.reviewService.createReview(user.id || user.sub, input);
  }

  @ResolveField(() => User, { nullable: true })
  async reviewer(@Parent() review: Review): Promise<User | null> {
    if (!review.reviewerId) return null;
    return this.dataloaderService.userLoader.load(review.reviewerId);
  }

  @ResolveField(() => User, { nullable: true })
  async reviewee(@Parent() review: Review): Promise<User | null> {
    if (!review.revieweeId) return null;
    return this.dataloaderService.userLoader.load(review.revieweeId);
  }

  @ResolveField(() => Skill, { nullable: true })
  async skill(@Parent() review: Review): Promise<Skill | null> {
    if (!review.skillId) return null;
    return this.dataloaderService.skillLoader.load(review.skillId);
  }
}
