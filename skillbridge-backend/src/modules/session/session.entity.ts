import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSONObject } from 'graphql-type-json';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { MatchRequest } from '../match/match-request.entity';
import { User } from '../user/user.entity';
import { Skill } from '../skill/skill.entity';

export enum SessionStatus {
  NEGOTIATING = 'NEGOTIATING',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REVIEWED = 'REVIEWED',
  CANCELLED = 'CANCELLED',
}
registerEnumType(SessionStatus, { name: 'SessionStatus' });

export enum SessionFormat {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  IN_PERSON = 'IN_PERSON',
}
registerEnumType(SessionFormat, { name: 'SessionFormat' });

@ObjectType()
@Entity('sessions')
export class Session {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  matchRequestId?: string;

  @Field(() => MatchRequest, { nullable: true })
  @ManyToOne(() => MatchRequest, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'matchRequestId' })
  matchRequest?: MatchRequest;

  @Field()
  @Column()
  @Index()
  participant1Id: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant1Id' })
  participant1?: User;

  @Field()
  @Column()
  @Index()
  participant2Id: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant2Id' })
  participant2?: User;

  @Field()
  @Column()
  skill1Id: string;

  @Field(() => Skill, { nullable: true })
  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill1Id' })
  skill1?: Skill;

  @Field()
  @Column()
  skill2Id: string;

  @Field(() => Skill, { nullable: true })
  @ManyToOne(() => Skill, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'skill2Id' })
  skill2?: Skill;

  @Field(() => SessionStatus)
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.NEGOTIATING,
  })
  status: SessionStatus;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Field({ nullable: true })
  @Column({ type: 'int', nullable: true })
  duration?: number; // In minutes

  @Field(() => SessionFormat, { nullable: true })
  @Column({ type: 'enum', enum: SessionFormat, nullable: true })
  format?: SessionFormat;

  @Field({ nullable: true })
  @Column({ nullable: true })
  meetingLink?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  summary?: string;

  @Field(() => Boolean)
  @Column({ default: false })
  p1Completed: boolean;

  @Field(() => Boolean)
  @Column({ default: false })
  p2Completed: boolean;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'JSON structure for session milestones',
  })
  @Column({ type: 'jsonb', nullable: true })
  checkpoints?: any;

  @Field({
    nullable: true,
    description: 'AI-generated roadmap for future direction after this session',
  })
  @Column({ type: 'text', nullable: true })
  roadmap?: string;

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description: 'JSON structure for AI-suggested learning resources',
  })
  @Column({ type: 'jsonb', nullable: true })
  suggestedResources?: any;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field()
  @VersionColumn()
  version: number;
}
