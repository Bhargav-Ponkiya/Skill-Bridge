import { ObjectType, Field } from '@nestjs/graphql';
import { Skill } from '../skill.entity';
import { PaginationMeta } from '../../../common/dto/pagination.dto';

@ObjectType()
export class PaginatedSkills {
  @Field(() => [Skill])
  items: Skill[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
