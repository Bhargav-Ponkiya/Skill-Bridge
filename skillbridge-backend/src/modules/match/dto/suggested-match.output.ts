import { ObjectType, Field, Float } from '@nestjs/graphql';
import { Skill } from '../../skill/skill.entity';

@ObjectType()
export class AffinityBreakdown {
  @Field(() => Float, { description: 'Semantic similarity contribution (0-100)' })
  semanticScore: number;

  @Field(() => Float, { description: 'Category match contribution (0-100)' })
  categoryScore: number;

  @Field(() => Float, { description: 'Boost for previously explored but deep-dive skills' })
  depthBoost: number;
}

@ObjectType()
export class SuggestedMatch {
  @Field()
  id: string;

  @Field(() => Skill)
  skill: Skill;

  @Field(() => Float, { description: 'Affinity score 0-100 from bidirectional matching' })
  score: number;

  @Field({ description: 'Human-readable reason for this match' })
  reason: string;

  @Field({ nullable: true, description: 'Which of the current user\'s WANT skills this matched against' })
  matchedWantSkillId?: string;

  @Field({ nullable: true })
  matchedWantSkillTitle?: string;

  @Field(() => Float, { nullable: true, description: 'Reverse direction score: how well your OFFER matches their WANT' })
  reciprocalScore?: number;

  @Field(() => AffinityBreakdown, { description: 'Breakdown of the forward affinity score.' })
  affinityBreakdown: AffinityBreakdown;
}
