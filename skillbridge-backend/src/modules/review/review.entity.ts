import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Session } from '../session/session.entity';
import { Skill } from '../skill/skill.entity';
import { User } from '../user/user.entity';

@ObjectType()
@Entity('reviews')
export class Review {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  @Index()
  sessionId: string;

  @Field(() => Session, { nullable: true })
  @ManyToOne(() => Session, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @Field({ nullable: true })
  @Column({ nullable: true })
  @Index()
  skillId?: string;

  @Field(() => Skill, { nullable: true })
  @ManyToOne(() => Skill, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'skillId' })
  skill?: Skill;

  @Field()
  @Column()
  @Index()
  reviewerId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewerId' })
  reviewer?: User;

  @Field()
  @Column()
  @Index()
  revieweeId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'revieweeId' })
  reviewee?: User;

  @Field(() => Int)
  @Column({ type: 'int' })
  rating: number; // e.g., 1 to 5

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Field({ defaultValue: false })
  @Column({ default: false })
  endorsedSkill: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
