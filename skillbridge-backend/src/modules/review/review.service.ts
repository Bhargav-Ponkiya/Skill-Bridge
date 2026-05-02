import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './review.entity';
import { CreateReviewInput } from './dto/create-review.input';
import { Session, SessionStatus } from '../session/session.entity';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async createReview(reviewerId: string, input: CreateReviewInput): Promise<Review> {
    const session = await this.sessionRepository.findOne({ where: { id: input.sessionId } });
    
    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.REVIEWED) {
      throw new BadRequestException('Can only review completed sessions');
    }

    const review = this.reviewRepository.create({
      ...input,
      reviewerId,
    });

    const savedReview = await this.reviewRepository.save(review);

    // Update session status to REVIEWED if not already
    if (session.status !== SessionStatus.REVIEWED) {
      session.status = SessionStatus.REVIEWED;
      await this.sessionRepository.save(session);
    }

    return savedReview;
  }

  async getReviewsForUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { revieweeId: userId },
      order: { createdAt: 'DESC' },
      relations: ['reviewer'],
    });
  }
}
