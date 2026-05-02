import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { Message } from '../message/message.entity';
import { Review } from '../review/review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Message, Review])],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
