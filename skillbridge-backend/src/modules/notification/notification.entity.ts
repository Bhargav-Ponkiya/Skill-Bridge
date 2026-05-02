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
import { User } from '../user/user.entity';

export enum NotificationType {
  MATCH_REQUEST = 'MATCH_REQUEST',
  MATCH_ACCEPTED = 'MATCH_ACCEPTED',
  SESSION_REMINDER = 'SESSION_REMINDER',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

@ObjectType()
@Entity('notifications')
export class Notification {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  @Index()
  userId: string;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Field()
  @Column({ type: 'varchar' }) // Avoid an enum here so we don't need a DB-level enum type unless desired
  type: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  message: string;

  @Field()
  @Column({ default: false })
  isRead: boolean;

  @Field({ nullable: true })
  @Column({ nullable: true })
  relatedId?: string; // ID of the MatchRequest, Session, etc.

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
