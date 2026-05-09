import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewService } from './review.service';
import { ReviewResolver } from './review.resolver';
import { Session } from '../session/session.entity';
import { DataloaderModule } from '../dataloader/dataloader.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Session]), DataloaderModule],
  providers: [ReviewService, ReviewResolver],
  exports: [ReviewService],
})
export class ReviewModule {}
