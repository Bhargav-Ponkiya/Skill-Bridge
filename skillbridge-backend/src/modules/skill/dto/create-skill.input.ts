import { InputType, Field } from '@nestjs/graphql';
import { SkillType, ProficiencyLevel } from '../skill.entity';
import { IsNotEmpty, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';

@InputType()
export class CreateSkillInput {
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
  @IsString()
  category: string;

  @Field(() => SkillType)
  @IsEnum(SkillType)
  type: SkillType;

  @Field(() => ProficiencyLevel, { nullable: true })
  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
