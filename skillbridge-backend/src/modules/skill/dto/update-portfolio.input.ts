import { InputType, Field, PartialType, ID } from '@nestjs/graphql';
import { AddPortfolioInput } from './add-portfolio.input';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class UpdatePortfolioInput extends PartialType(AddPortfolioInput) {
  @Field(() => ID)
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
