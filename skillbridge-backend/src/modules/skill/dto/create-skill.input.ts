import { InputType, Field } from '@nestjs/graphql';
import { SkillType, ProficiencyLevel } from '../skill.entity';
import { IsNotEmpty, IsEnum, IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';

@InputType()
export class CreateSkillInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
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
