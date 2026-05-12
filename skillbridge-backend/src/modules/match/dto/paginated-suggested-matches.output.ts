import { ObjectType, Field } from '@nestjs/graphql';
import { SuggestedMatch } from './suggested-match.output';
import { PaginationMeta } from '../../../common/dto/pagination.dto';

@ObjectType()
export class PaginatedSuggestedMatches {
  @Field(() => [SuggestedMatch])
  items: SuggestedMatch[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
