import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

@InputType()
export class CreateMessageInput {
  @Field()
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  content: string;
}
