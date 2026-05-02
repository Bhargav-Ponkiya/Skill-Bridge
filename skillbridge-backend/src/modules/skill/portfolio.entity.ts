import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Skill } from './skill.entity';

@Entity('portfolios')
@ObjectType()
export class Portfolio {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  title: string;

  @Column({ nullable: true })
  @Field({ nullable: true })
  description?: string;

  @Column()
  @Field()
  url: string;

  @Column({ default: 'other' })
  @Field()
  type: string;

  @Column()
  @Field()
  skillId: string;

  @ManyToOne(() => Skill, (skill) => skill.portfolios, { onDelete: 'CASCADE' })
  skill: Skill;

  @CreateDateColumn()
  @Field()
  createdAt: Date;

  @UpdateDateColumn()
  @Field()
  updatedAt: Date;
}
