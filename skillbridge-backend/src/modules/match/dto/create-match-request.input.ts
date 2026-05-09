import { InputType, Field, ID } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class CreateMatchRequestInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  toUserId: string;

  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  offeredSkillId: string;

  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  wantedSkillId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
