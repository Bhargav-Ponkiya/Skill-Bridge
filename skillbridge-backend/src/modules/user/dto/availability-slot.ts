import { ObjectType, InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

/**
 * A weekly recurring availability window in the user's local time.
 * day: 0 = Sunday … 6 = Saturday
 * startMinute / endMinute: minutes since midnight (0–1440), startMinute < endMinute.
 */
@ObjectType()
export class AvailabilitySlot {
  @Field(() => Int)
  day: number;

  @Field(() => Int)
  startMinute: number;

  @Field(() => Int)
  endMinute: number;
}

@InputType()
export class AvailabilitySlotInput {
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(6)
  day: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(1440)
  startMinute: number;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(1440)
  endMinute: number;
}
