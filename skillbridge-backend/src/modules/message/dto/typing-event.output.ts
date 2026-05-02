import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class TypingEvent {
  @Field()
  sessionId: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  userName?: string;

  @Field()
  isTyping: boolean;
}
