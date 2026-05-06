import { InputType, Field, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, Min, Max, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @Field()
  @IsUUID()
  @IsNotEmpty()
  revieweeId: string;

  @Field(() => Int)
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  comment?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  endorsedSkill?: boolean;
}
