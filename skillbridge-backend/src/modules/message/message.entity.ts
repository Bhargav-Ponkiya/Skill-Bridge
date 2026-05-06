import { ObjectType, Field, ID } from '@nestjs/graphql';
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
import { MatchRequest } from '../match/match-request.entity';
import { User } from '../user/user.entity';

@ObjectType()
@Entity('messages')
@Index(['sessionId', 'createdAt'])
@Index(['matchRequestId', 'createdAt'])
export class Message {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  sessionId: string | null;

  @Field(() => Session, { nullable: true })
  @ManyToOne(() => Session, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  matchRequestId: string | null;

  @Field(() => MatchRequest, { nullable: true })
  @ManyToOne(() => MatchRequest, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'matchRequestId' })
  matchRequest?: MatchRequest;

  @Field()
  @Column()
  senderId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender?: User;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field()
  @Column({ default: false })
  isRead: boolean;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
