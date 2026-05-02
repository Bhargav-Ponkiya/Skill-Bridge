import { InputType, Field, ID } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateMatchRequestInput {
  @Field(() => ID)
  @IsNotEmpty()
  toUserId: string;

  @Field(() => ID)
  @IsNotEmpty()
  offeredSkillId: string;

  @Field(() => ID)
  @IsNotEmpty()
  wantedSkillId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  message?: string;
}
