import { ObjectType, Field, ID } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Skill } from '../skill/skill.entity';
import { AvailabilitySlot } from './dto/availability-slot';

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  name: string;

  @Column({ nullable: true })
  passwordHash?: string;

  @Column({ nullable: true, unique: true })
  googleId?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatar?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  timezone?: string;

  @Field(() => [AvailabilitySlot], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  availability?: AvailabilitySlot[];

  @Field()
  @Column({ default: false })
  isVerified: boolean;

  @Field()
  @Column({ default: false })
  isGuest: boolean;

  @Field({ defaultValue: 'user' })
  @Column({ type: 'varchar', default: 'user' })
  role: string;

  @Field(() => [Skill], { nullable: 'itemsAndList' })
  @OneToMany(() => Skill, (skill: Skill) => skill.user)
  skills?: Skill[];

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
