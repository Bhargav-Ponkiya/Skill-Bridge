import { InputType, PartialType } from '@nestjs/graphql';
import { AddPortfolioInput } from './add-portfolio.input';

@InputType()
export class UpdatePortfolioInput extends PartialType(AddPortfolioInput) {} // id is passed as separate GraphQL arg, not in input
