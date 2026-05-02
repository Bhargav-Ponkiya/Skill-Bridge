import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PubSub } from 'graphql-subscriptions';
import { MatchRequest, MatchRequestStatus } from './match-request.entity';
import { CreateMatchRequestInput } from './dto/create-match-request.input';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CacheService } from '../cache/cache.service';
import { Skill } from '../skill/skill.entity';
import { Session, SessionStatus } from '../session/session.entity';
import { SuggestedMatch } from './dto/suggested-match.output';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { PaginatedMatchRequests } from './dto/paginated-match-requests.output';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(MatchRequest)
    private matchRequestRepository: Repository<MatchRequest>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private readonly amqpConnection: AmqpConnection,
    private readonly cacheService: CacheService,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  async sendMatchRequest(fromUserId: string, input: CreateMatchRequestInput): Promise<MatchRequest> {
    if (fromUserId === input.toUserId) {
      throw new BadRequestException('Cannot send a match request to yourself.');
    }

    const offered = await this.skillRepository.findOne({ where: { id: input.offeredSkillId } });
    if (!offered || offered.userId !== fromUserId) {
      throw new BadRequestException('Offered skill must belong to you.');
    }
    const wanted = await this.skillRepository.findOne({ where: { id: input.wantedSkillId } });
    if (!wanted || wanted.userId !== input.toUserId) {
      throw new BadRequestException('Wanted skill does not belong to the target user.');
    }

    const existing = await this.matchRequestRepository.findOne({
      where: {
        fromUserId,
        toUserId: input.toUserId,
        offeredSkillId: input.offeredSkillId,
        wantedSkillId: input.wantedSkillId,
        status: MatchRequestStatus.PENDING,
      },
    });
    if (existing) {
      throw new BadRequestException('You already have a pending request for this exchange.');
    }

    const matchRequest = this.matchRequestRepository.create({
      fromUserId,
      toUserId: input.toUserId,
      offeredSkillId: input.offeredSkillId,
      wantedSkillId: input.wantedSkillId,
      message: input.message,
    });

    const savedRequest = await this.matchRequestRepository.save(matchRequest);

    try {
      await this.amqpConnection.publish('skillbridge.exchange', 'match.requested', {
        matchRequestId: savedRequest.id,
        fromUserId,
        toUserId: input.toUserId,
      });
    } catch (err) {
      this.logger.error('Failed to publish match.requested event', err);
    }

    // Live push so the recipient's matches inbox updates without a refresh.
    this.pubSub.publish('matchRequestUpdated', { matchRequestUpdated: savedRequest });

    // Both users' suggestion lists may now have new skills to exclude.
    await this.invalidateSuggestionCache(fromUserId, input.toUserId);

    return savedRequest;
  }

  async respondToMatchRequest(userId: string, requestId: string, accept: boolean): Promise<MatchRequest> {
    const matchRequest = await this.matchRequestRepository.findOne({ where: { id: requestId, toUserId: userId } });

    if (!matchRequest) {
      throw new NotFoundException('Match request not found or unauthorized.');
    }

    if (matchRequest.status !== MatchRequestStatus.PENDING) {
      throw new BadRequestException('Match request has already been processed.');
    }

    matchRequest.status = accept ? MatchRequestStatus.ACCEPTED : MatchRequestStatus.DECLINED;
    const updated = await this.matchRequestRepository.save(matchRequest);

    if (accept) {
      // Session creation is on the critical path — do it synchronously so the client sees the
      // session in the very next refetch (no broker round-trip, no polling delay).
      try {
        const existing = await this.sessionRepository.findOne({
          where: { matchRequestId: updated.id },
        });
        if (!existing) {
          const session = this.sessionRepository.create({
            matchRequestId: updated.id,
            participant1Id: updated.fromUserId,
            participant2Id: updated.toUserId,
            skill1Id: updated.offeredSkillId,
            skill2Id: updated.wantedSkillId,
            status: SessionStatus.NEGOTIATING,
          });
          await this.sessionRepository.save(session);
        }
      } catch (err) {
        // Session DB write failed — undo the accept so the user can retry cleanly.
        matchRequest.status = MatchRequestStatus.PENDING;
        await this.matchRequestRepository.save(matchRequest);
        this.logger.error(`Failed to create session synchronously: ${(err as Error).message}`);
        throw new InternalServerErrorException(
          'Could not create session. Please try again shortly.',
        );
      }

      // Best-effort fan-out: notifications/emails subscribe to match.accepted. If Rabbit is down,
      // the session is already created — log and move on.
      this.amqpConnection
        .publish('skillbridge.exchange', 'match.accepted', { matchRequestId: updated.id })
        .catch((err) => {
          this.logger.warn(
            `Non-critical: failed to publish match.accepted: ${(err as Error).message}`,
          );
        });
    }

    // Live push so the original sender's "Sent" tab updates the moment we respond.
    this.pubSub.publish('matchRequestUpdated', { matchRequestUpdated: updated });

    // Both sides may have new exclusions (acceptance creates a session) or new openings (decline).
    await this.invalidateSuggestionCache(updated.fromUserId, updated.toUserId);

    return updated;
  }

  async getMyRequests(
    userId: string,
    type: 'sent' | 'received' | 'incoming',
    pagination: PaginationInput = { page: 1, limit: 20 },
  ): Promise<PaginatedMatchRequests> {
    const sent = type === 'sent';
    const [items, totalItems] = await this.matchRequestRepository.findAndCount({
      where: sent ? { fromUserId: userId } : { toUserId: userId },
      order: { createdAt: 'DESC' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    });

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: pagination.limit,
        totalPages: Math.ceil(totalItems / pagination.limit),
        currentPage: pagination.page,
      },
    };
  }

  /**
   * Returns a ranked list of skills that complement the current user's WANT skills.
   * Score is derived from pgvector cosine distance (lower distance = higher score),
   * falling back to category match when embeddings aren't available yet.
   */
  async getSuggestedMatches(userId: string): Promise<SuggestedMatch[]> {
    const cacheKey = `suggested_matches_v2:${userId}`;
    const cached = await this.cacheService.get<SuggestedMatch[]>(cacheKey);
    if (cached) return cached;

    // Skills the user has already actioned on — these should never appear in suggestions.
    // Two buckets:
    //   1. Wanted skills tied to an open (PENDING/ACCEPTED) request the user sent.
    //   2. Skills already in flight via an active session (NEGOTIATING/SCHEDULED/ACTIVE) where
    //      the user is either side. Avoids double-booking the same exchange.
    const excludedSkillIds = await this.computeExcludedSkillIds(userId);
    const excludedArray = Array.from(excludedSkillIds);
    const completedCategories = await this.computeCompletedCategories(userId);

    const userWants = await this.skillRepository.manager.query(
      `SELECT id, title, category, embedding FROM skills
       WHERE "userId" = $1 AND type = 'WANT' AND "isActive" = true
       ORDER BY "createdAt" DESC`,
      [userId],
    );

    if (!userWants || userWants.length === 0) {
      // Cold start: surface trending OFFERS from other users with category diversity
      const cold = await this.skillRepository.manager.query(
        `SELECT * FROM skills
         WHERE "userId" != $1 AND type = 'OFFER' AND "isActive" = true
           AND ($2::uuid[] IS NULL OR id != ALL($2::uuid[]))
         ORDER BY "createdAt" DESC LIMIT 12`,
        [userId, excludedArray.length ? excludedArray : null],
      );
      const result: SuggestedMatch[] = cold.map((row: any) => ({
        id: `cold-${row.id}`,
        skill: this.rowToSkill(row),
        score: 60,
        reason: 'Popular skill in the community — add a "Want" to your profile to get personalized matches.',
        matchedWantSkillId: undefined,
        matchedWantSkillTitle: undefined,
      }));
      await this.cacheService.set(cacheKey, result, 300);
      return result;
    }

    // For each WANT skill, query top semantic neighbours, accumulate, then dedupe.
    const collected = new Map<string, SuggestedMatch>();

    for (const want of userWants) {
      let rows: any[] = [];
      if (want.embedding) {
        rows = await this.skillRepository.manager.query(
          `SELECT *, (embedding <=> $2) AS distance
           FROM skills
           WHERE "userId" != $1 AND type = 'OFFER' AND "isActive" = true AND embedding IS NOT NULL
             AND ($3::uuid[] IS NULL OR id != ALL($3::uuid[]))
           ORDER BY embedding <=> $2
           LIMIT 8`,
          [userId, want.embedding, excludedArray.length ? excludedArray : null],
        );
      }

      if (rows.length === 0) {
        // Fallback to exact category match
        rows = await this.skillRepository.manager.query(
          `SELECT *, NULL AS distance FROM skills
           WHERE "userId" != $1 AND type = 'OFFER' AND category = $2 AND "isActive" = true
             AND ($3::uuid[] IS NULL OR id != ALL($3::uuid[]))
           LIMIT 8`,
          [userId, want.category, excludedArray.length ? excludedArray : null],
        );
      }

      for (const row of rows) {
          const affinity = this.calculateAffinity(row, want, row.distance, completedCategories);
          collected.set(row.id, {
            id: row.id,
            skill: this.rowToSkill(row),
            score: affinity.total,
            reason: this.buildReason(affinity.total, want.title, row.title, row.category, want.category),
            matchedWantSkillId: want.id,
            matchedWantSkillTitle: want.title,
            affinityBreakdown: {
              semanticScore: affinity.semantic,
              categoryScore: affinity.category,
              depthBoost: affinity.depth,
            },
          });
      }
    }

    const ranked = Array.from(collected.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    await this.cacheService.set(cacheKey, ranked, 300);
    return ranked;
  }

  private async invalidateSuggestionCache(...userIds: string[]): Promise<void> {
    await Promise.all(
      userIds
        .filter(Boolean)
        .map((id) => this.cacheService.del(`suggested_matches_v2:${id}`).catch(() => undefined)),
    );
  }

  private async computeExcludedSkillIds(userId: string): Promise<Set<string>> {
    const excluded = new Set<string>();

    // Skills the user has an open request for (as sender).
    const openRequests = await this.matchRequestRepository.find({
      where: [
        { fromUserId: userId, status: MatchRequestStatus.PENDING },
        { fromUserId: userId, status: MatchRequestStatus.ACCEPTED },
      ],
      select: ['wantedSkillId', 'offeredSkillId'],
    });
    for (const r of openRequests) {
      if (r.wantedSkillId) excluded.add(r.wantedSkillId);
      if (r.offeredSkillId) excluded.add(r.offeredSkillId);
    }

    // Skills currently in an active session where this user participates.
    const activeSessionSkills = await this.skillRepository.manager.query(
      `SELECT "skill1Id", "skill2Id" FROM sessions
       WHERE ("participant1Id" = $1 OR "participant2Id" = $1)
         AND status IN ('NEGOTIATING', 'SCHEDULED', 'ACTIVE')`,
      [userId],
    );
    for (const row of activeSessionSkills as any[]) {
      if (row.skill1Id) excluded.add(row.skill1Id);
      if (row.skill2Id) excluded.add(row.skill2Id);
    }

    return excluded;
  }

  private async computeCompletedCategories(userId: string): Promise<Set<string>> {
    const categories = new Set<string>();
    const sessions = await this.sessionRepository.manager.query(
      `SELECT s.category FROM sessions sess
       JOIN skills s ON (sess."skill1Id" = s.id OR sess."skill2Id" = s.id)
       WHERE (sess."participant1Id" = $1 OR sess."participant2Id" = $1)
         AND sess.status = 'COMPLETED'`,
      [userId],
    );
    for (const row of sessions) {
      if (row.category) categories.add(row.category);
    }
    return categories;
  }

  private rowToSkill(row: any): Skill {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: row.description,
      category: row.category,
      type: row.type,
      proficiencyLevel: row.proficiencyLevel,
      isActive: row.isActive,
      embedding: undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Skill;
  }

  private calculateAffinity(offer: any, want: any, distance: number | null, completedCategories: Set<string>): { total: number; semantic: number; category: number; depth: number } {
    const semantic = distance !== null ? Math.max(0, Math.min(100, Math.round(99 - (distance * 47)))) : 0;
    const category = offer.category === want.category ? 100 : 0;
    
    // Depth boost: if the user has already completed a session in this category,
    // it suggests they are "learning in depth" or seeking more advanced knowledge.
    const isReturningCategory = completedCategories.has(offer.category);
    const depth = (offer.category === want.category && isReturningCategory) ? 10 : 0;

    // Blend: 70% semantic, 25% category, 5% depth (doubled if returning)
    const total = Math.round((semantic * 0.7) + (category * 0.25) + depth);
    
    return { total: Math.max(5, Math.min(99, total)), semantic, category, depth };
  }

  private buildReason(score: number, wantTitle: string, offerTitle: string, offerCategory: string, wantCategory: string): string {
    if (score >= 90) return `Precise match for your "${wantTitle}" goal — their expertise in "${offerTitle}" is a top-tier fit.`;
    if (score >= 80) return `Highly relevant: your "${wantTitle}" interest aligns clearly with their "${offerTitle}" offering.`;
    if (offerCategory === wantCategory) return `Common ground: you both focus on ${offerCategory}.`;
    return `Potential crossover: your "${wantTitle}" goal may benefit from their knowledge of "${offerTitle}".`;
  }
}
