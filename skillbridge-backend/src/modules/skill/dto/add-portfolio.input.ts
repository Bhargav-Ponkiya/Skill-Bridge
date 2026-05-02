import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsUrl, IsOptional } from 'class-validator';

@InputType()
export class AddPortfolioInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @Field({ defaultValue: 'other' })
  @IsOptional()
  @IsString()
  type: string;

  @Field()
  @IsNotEmpty()
  skillId: string;
}
