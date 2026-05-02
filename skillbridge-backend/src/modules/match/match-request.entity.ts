import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
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
import { User } from '../user/user.entity';
import { Skill } from '../skill/skill.entity';

export enum MatchRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}
registerEnumType(MatchRequestStatus, { name: 'MatchRequestStatus' });

@ObjectType()
@Entity('match_requests')
export class MatchRequest {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  @Index()
  fromUserId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fromUserId' })
  fromUser?: User;

  @Field()
  @Column()
  @Index()
  toUserId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'toUserId' })
  toUser?: User;

  @Field()
  @Column()
  offeredSkillId: string;

  @Field(() => Skill, { nullable: true })
  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offeredSkillId' })
  offeredSkill?: Skill;

  @Field()
  @Column()
  wantedSkillId: string;

  @Field(() => Skill, { nullable: true })
  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'wantedSkillId' })
  wantedSkill?: Skill;

  @Field(() => MatchRequestStatus)
  @Column({ type: 'enum', enum: MatchRequestStatus, default: MatchRequestStatus.PENDING })
  status: MatchRequestStatus;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  message?: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
