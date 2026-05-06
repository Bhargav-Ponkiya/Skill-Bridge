import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

@InputType()
export class CreateMessageInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
