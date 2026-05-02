import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsString, IsDateString } from 'class-validator';

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

  @Field({ nullable: true })
  @IsOptional()
  duration?: number;
}
