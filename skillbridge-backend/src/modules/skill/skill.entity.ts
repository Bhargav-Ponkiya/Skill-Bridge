import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Portfolio } from './portfolio.entity';

export enum SkillType {
  OFFER = 'OFFER',
  WANT = 'WANT',
}
registerEnumType(SkillType, { name: 'SkillType' });

export enum ProficiencyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  EXPERT = 'EXPERT',
}
registerEnumType(ProficiencyLevel, { name: 'ProficiencyLevel' });

@ObjectType()
@Entity('skills')
export class Skill {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  @Index()
  userId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field()
  @Column()
  category: string;

  @Field(() => SkillType)
  @Column({ type: 'enum', enum: SkillType })
  type: SkillType;

  @Field(() => ProficiencyLevel, { nullable: true })
  @Column({ type: 'enum', enum: ProficiencyLevel, nullable: true })
  proficiencyLevel?: ProficiencyLevel;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  // Uses pgvector type.
  @Column({ type: 'vector', length: 768, nullable: true })
  embedding?: string; // TypeORM maps vector to string natively if you don't parse it

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => [Portfolio], { nullable: true })
  @OneToMany(() => Portfolio, (portfolio) => portfolio.skill)
  portfolios?: Portfolio[];
}
