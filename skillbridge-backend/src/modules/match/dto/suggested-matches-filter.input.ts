import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsOptional, Min, Max } from 'class-validator';

@InputType()
export class SuggestedMatchesFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  search?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @Min(0)
  @Max(100)
  minAffinity?: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @Min(1)
  page: number = 1;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
