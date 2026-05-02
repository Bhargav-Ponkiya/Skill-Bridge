import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../notification.entity';

@InputType()
export class CreateNotificationInput {
  @Field()
  @IsNotEmpty()
  userId: string;

  @Field(() => NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @Field()
  @IsNotEmpty()
  title: string;

  @Field()
  @IsNotEmpty()
  message: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  relatedId?: string;
}
