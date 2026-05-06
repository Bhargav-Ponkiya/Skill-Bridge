import { InputType, Field, Int } from '@nestjs/graphql';
import { Min, Max, IsOptional, IsString } from 'class-validator';

@InputType()
export class CursorPaginationInput {
  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  cursor?: string;
}
