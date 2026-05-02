import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { AddPortfolioInput } from './add-portfolio.input';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class UpdatePortfolioInput extends PartialType(AddPortfolioInput) {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  id: string;
}
