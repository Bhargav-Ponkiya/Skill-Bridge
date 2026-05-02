import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class TrustBreakdown {
  @Field(() => Float)
  reviewSignal: number;

  @Field(() => Float)
  sessionSignal: number;

  @Field(() => Float)
  portfolioSignal: number;
}

@ObjectType()
export class UserStats {
  @Field(() => Int)
  reviewCount: number;

  @Field(() => Float)
  averageRating: number;

  @Field(() => Int)
  sessionsCompleted: number;

  @Field(() => Int)
  skillsOffered: number;

  @Field(() => Int)
  skillsWanted: number;

  @Field(() => Int)
  portfolioCount: number;

  @Field(() => Float, { description: 'A 0-100 trust signal blending reviews, completed sessions, and portfolio richness.' })
  trustScore: number;

  @Field(() => TrustBreakdown, { description: 'The individual signals that contribute to the trust score.' })
  trustBreakdown: TrustBreakdown;
}
