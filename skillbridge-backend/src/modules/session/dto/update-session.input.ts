import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

@InputType()
export class UpdateSessionInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  format?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  scheduledAt?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  version: number;
}
