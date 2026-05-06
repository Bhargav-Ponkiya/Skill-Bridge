import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Skill } from '../skill.entity';

@ObjectType()
export class SkillEdge {
  @Field(() => Skill)
  node: Skill;

  @Field()
  cursor: string;
}

@ObjectType()
export class SkillPageInfo {
  @Field()
  hasNextPage: boolean;

  @Field({ nullable: true })
  endCursor?: string;
}

@ObjectType()
export class PaginatedSkills {
  @Field(() => [SkillEdge])
  edges: SkillEdge[];

  @Field(() => SkillPageInfo)
  pageInfo: SkillPageInfo;

  @Field(() => Int)
  totalCount: number;
}
