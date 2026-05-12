import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileInput } from './dto/update-profile.input';
import { UserStats } from './dto/user-stats.output';
import {
  AvailabilitySlot,
  AvailabilitySlotInput,
} from './dto/availability-slot';
import { Skill, SkillType } from '../skill/skill.entity';
import { Portfolio } from '../skill/portfolio.entity';
import { Session, SessionStatus } from '../session/session.entity';
import { Review } from '../review/review.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(Portfolio)
    private portfolioRepository: Repository<Portfolio>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByUsernameOrEmail(identifier: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { name: identifier }],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findManyByIds(ids: readonly string[]): Promise<User[]> {
    const users = await this.userRepository.find({
      where: { id: In(ids) },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => userMap.get(id) as User);
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, input);
    return this.userRepository.save(user);
  }

  /**
   * Replace the user's weekly availability. Slots are normalised: each must have
   * startMinute < endMinute and no overlapping windows on the same day (overlapping
   * windows get merged so the partner sees one block instead of two).
   */
  async setAvailability(
    id: string,
    slots: AvailabilitySlotInput[],
  ): Promise<AvailabilitySlot[]> {
    const user = await this.findById(id);
    const normalised = this.normaliseAvailability(slots);
    user.availability = normalised;
    await this.userRepository.save(user);
    return normalised;
  }

  private normaliseAvailability(
    slots: AvailabilitySlotInput[],
  ): AvailabilitySlot[] {
    const valid = (slots ?? []).filter(
      (s) =>
        Number.isInteger(s.day) &&
        s.day >= 0 &&
        s.day <= 6 &&
        s.startMinute >= 0 &&
        s.endMinute > s.startMinute &&
        s.endMinute <= 1440,
    );

    // Merge overlaps per day.
    const byDay = new Map<number, AvailabilitySlot[]>();
    for (const s of valid) {
      const list = byDay.get(s.day) ?? [];
      list.push({
        day: s.day,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
      });
      byDay.set(s.day, list);
    }
    const merged: AvailabilitySlot[] = [];
    for (const [day, list] of byDay) {
      list.sort((a, b) => a.startMinute - b.startMinute);
      let current = list[0];
      for (let i = 1; i < list.length; i++) {
        const next = list[i];
        if (next.startMinute <= current.endMinute) {
          current = {
            day,
            startMinute: current.startMinute,
            endMinute: Math.max(current.endMinute, next.endMinute),
          };
        } else {
          merged.push(current);
          current = next;
        }
      }
      merged.push(current);
    }
    merged.sort((a, b) => a.day - b.day || a.startMinute - b.startMinute);
    return merged;
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const [
      reviews,
      offeredCount,
      wantedCount,
      portfolios,
      completedSessions,
      totalEndorsements,
    ] = await Promise.all([
      this.reviewRepository.find({ where: { revieweeId: userId } }),
      this.skillRepository.count({ where: { userId, type: SkillType.OFFER } }),
      this.skillRepository.count({ where: { userId, type: SkillType.WANT } }),
      this.portfolioRepository
        .createQueryBuilder('p')
        .innerJoin('p.skill', 's')
        .where('s.userId = :userId', { userId })
        .getCount(),
      this.sessionRepository
        .createQueryBuilder('s')
        .where('(s.participant1Id = :userId OR s.participant2Id = :userId)', {
          userId,
        })
        .andWhere('s.status IN (:...statuses)', {
          statuses: [SessionStatus.COMPLETED, SessionStatus.REVIEWED],
        })
        .getCount(),
      this.skillRepository
        .createQueryBuilder('s')
        .select('SUM(s."endorsementsCount")', 'total')
        .where('s.userId = :userId', { userId })
        .getRawOne<{ total: string }>(),
    ]);

    const reviewCount = reviews.length;
    const averageRating =
      reviewCount === 0
        ? 0
        : reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewCount;

    const endorsementCount = parseInt(totalEndorsements?.total || '0', 10) || 0;

    // Trust score: blend of review quality, completed sessions, portfolio richness, and skill endorsements.
    const averageRatingFactor = averageRating / 5 || 0.5;
    const reviewSignal = Math.min(35, reviewCount * 4) * averageRatingFactor;
    const sessionSignal = Math.min(25, completedSessions * 5);
    const portfolioSignal = Math.min(20, portfolios * 6);
    const endorsementSignal = Math.min(20, endorsementCount * 10);
    const trustScore = Math.round(
      (reviewSignal || 0) +
        (sessionSignal || 0) +
        (portfolioSignal || 0) +
        (endorsementSignal || 0),
    );

    return {
      reviewCount,
      averageRating: Number(averageRating.toFixed(2)),
      sessionsCompleted: completedSessions,
      skillsOffered: offeredCount,
      skillsWanted: wantedCount,
      portfolioCount: portfolios,
      trustScore,
      trustBreakdown: {
        reviewSignal: Number(reviewSignal.toFixed(2)),
        sessionSignal: Number(sessionSignal.toFixed(2)),
        portfolioSignal: Number(portfolioSignal.toFixed(2)),
        endorsementSignal: Number(endorsementSignal.toFixed(2)),
      },
    };
  }
}
