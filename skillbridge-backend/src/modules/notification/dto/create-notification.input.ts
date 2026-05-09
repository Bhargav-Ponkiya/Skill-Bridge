import { InputType, Field } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NotificationType } from '../notification.entity';

@InputType()
export class CreateNotificationInput {
  @Field()
  @IsNotEmpty()
  @IsUUID()
  userId: string;

  @Field(() => NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  message: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  relatedId?: string;
}
