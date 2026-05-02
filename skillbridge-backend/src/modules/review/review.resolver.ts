import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { Review } from './review.entity';
import { ReviewService } from './review.service';
import { CreateReviewInput } from './dto/create-review.input';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { DataloaderService } from '../dataloader/dataloader.service';

@Resolver(() => Review)
export class ReviewResolver {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly dataloaderService: DataloaderService,
  ) {}

  @Query(() => [Review])
  async userReviews(@Args('userId') userId: string): Promise<Review[]> {
    return this.reviewService.getReviewsForUser(userId);
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
}
