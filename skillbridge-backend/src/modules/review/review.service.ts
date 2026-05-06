import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
  ) {}

  async createReview(reviewerId: string, input: CreateReviewInput): Promise<Review> {
    const session = await this.sessionRepository.findOne({ where: { id: input.sessionId } });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    if (session.status !== SessionStatus.COMPLETED && session.status !== SessionStatus.REVIEWED) {
      throw new BadRequestException('Can only review completed sessions');
    }

    if (session.participant1Id !== reviewerId && session.participant2Id !== reviewerId) {
      throw new BadRequestException('You are not a participant in this session');
    }

    if (reviewerId === input.revieweeId) {
      throw new BadRequestException('You cannot review yourself');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { sessionId: input.sessionId, reviewerId },
    });
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this session');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const review = this.reviewRepository.create({ ...input, reviewerId });
      const savedReview = await queryRunner.manager.save(review);

      if (input.endorsedSkill) {
        const endorsedSkillId =
          session.participant1Id === input.revieweeId ? session.skill1Id : session.skill2Id;
        await queryRunner.manager.query(
          'UPDATE skills SET "endorsementsCount" = "endorsementsCount" + 1 WHERE id = $1',
          [endorsedSkillId],
        );
      }

      const reviewCount = await queryRunner.manager.count(Review, {
        where: { sessionId: input.sessionId },
      });

      if (reviewCount >= 2 && session.status !== SessionStatus.REVIEWED) {
        session.status = SessionStatus.REVIEWED;
        await queryRunner.manager.save(session);
      }

      await queryRunner.commitTransaction();
      return savedReview;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getReviewsForUser(userId: string): Promise<Review[]> {
    return this.reviewRepository.find({
      where: { revieweeId: userId },
      order: { createdAt: 'DESC' },
      relations: ['reviewer'],
    });
  }
}
