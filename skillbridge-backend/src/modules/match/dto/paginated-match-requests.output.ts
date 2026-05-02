import { ObjectType, Field } from '@nestjs/graphql';
import { MatchRequest } from '../match-request.entity';
import { PaginationMeta } from '../../../common/dto/pagination.dto';

@ObjectType()
export class PaginatedMatchRequests {
  @Field(() => [MatchRequest])
  items: MatchRequest[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
