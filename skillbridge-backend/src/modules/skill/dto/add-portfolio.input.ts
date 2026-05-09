import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class AddPortfolioInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Field()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @Field({ defaultValue: 'other' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type: string;

  @Field()
  @IsNotEmpty()
  @IsUUID()
  skillId: string;
}
