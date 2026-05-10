import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { PubSub } from 'graphql-subscriptions';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchRequest, MatchRequestStatus } from './match-request.entity';
import { CreateMatchRequestInput } from './dto/create-match-request.input';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { CacheService } from '../cache/cache.service';
import { Skill } from '../skill/skill.entity';
import { Session, SessionStatus } from '../session/session.entity';
import { SuggestedMatch } from './dto/suggested-match.output';
import { PaginationInput } from '../../common/dto/pagination.dto';
import { PaginatedMatchRequests } from './dto/paginated-match-requests.output';
import { PaginatedSuggestedMatches } from './dto/paginated-suggested-matches.output';
import { SuggestedMatchesFilterInput } from './dto/suggested-matches-filter.input';
import { User } from '../user/user.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.entity';

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly amqpConnection: AmqpConnection,
    private readonly cacheService: CacheService,
    private readonly notificationService: NotificationService,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  async sendMatchRequest(
    fromUserId: string,
    input: CreateMatchRequestInput,
  ): Promise<MatchRequest> {
    if (fromUserId === input.toUserId) {
      throw new BadRequestException('Cannot send a match request to yourself.');
    }

    const sender = await this.userRepository.findOne({
      where: { id: fromUserId },
    });
    if (sender?.isGuest) {
      throw new BadRequestException(
        'Guest accounts cannot send swap requests. Please register first.',
      );
    }

    const pendingWithUser = await this.matchRequestRepository.count({
      where: {
        fromUserId,
        toUserId: input.toUserId,
        status: MatchRequestStatus.PENDING,
      },
    });
    if (pendingWithUser >= 3) {
      throw new BadRequestException(
        'You have too many pending requests with this user.',
      );
    }

    const offered = await this.skillRepository.findOne({
      where: { id: input.offeredSkillId },
    });
    if (!offered || offered.userId !== fromUserId) {
      throw new BadRequestException('Offered skill must belong to you.');
    }
    const wanted = await this.skillRepository.findOne({
      where: { id: input.wantedSkillId },
    });
    if (!wanted || wanted.userId !== input.toUserId) {
      throw new BadRequestException(
        'Wanted skill does not belong to the target user.',
      );
    }

    const existing = await this.matchRequestRepository.findOne({
      where: {
        fromUserId,
        toUserId: input.toUserId,
        offeredSkillId: input.offeredSkillId,
        wantedSkillId: input.wantedSkillId,
      },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      if (existing.status === MatchRequestStatus.PENDING) {
        throw new BadRequestException(
          'You already have a pending request for this exchange.',
        );
      }
      if (
        existing.status === MatchRequestStatus.DECLINED &&
        existing.updatedAt
      ) {
        const ageHours = (Date.now() - existing.updatedAt.getTime()) / 3600000;
        if (ageHours < 168) {
          throw new BadRequestException(
            'This user recently declined your request. Please wait before trying again.',
          );
        }
      }
    }

    const matchRequest = this.matchRequestRepository.create({
      fromUserId,
      toUserId: input.toUserId,
      offeredSkillId: input.offeredSkillId,
      wantedSkillId: input.wantedSkillId,
      message: input.message,
      offeredSkillSnapshot: {
        title: offered.title,
        description: offered.description,
        level: offered.proficiencyLevel,
      },
      wantedSkillSnapshot: {
        title: wanted.title,
        description: wanted.description,
        level: wanted.proficiencyLevel,
      },
    });

    const savedRequest = await this.matchRequestRepository.save(matchRequest);

    try {
      await this.amqpConnection.publish(
        'skillbridge.exchange',
        'match.requested',
        {
          matchRequestId: savedRequest.id,
          fromUserId,
          toUserId: input.toUserId,
        },
      );
    } catch (err) {
      this.logger.error('Failed to publish match.requested event', err);
    }

    // Live push so the recipient's matches inbox updates without a refresh.
    this.pubSub.publish('matchRequestUpdated', {
      matchRequestUpdated: savedRequest,
    });

    // Both users' suggestion lists may now have new skills to exclude.
    await this.invalidateSuggestionCache(fromUserId, input.toUserId);

    return savedRequest;
  }

  async respondToMatchRequest(
    userId: string,
    requestId: string,
    accept: boolean,
  ): Promise<MatchRequest> {
    const matchRequest = await this.matchRequestRepository.findOne({
      where: { id: requestId, toUserId: userId },
    });

    if (!matchRequest) {
      throw new NotFoundException('Match request not found or unauthorized.');
    }

    if (matchRequest.status !== MatchRequestStatus.PENDING) {
      throw new BadRequestException(
        'Match request has already been processed.',
      );
    }

    matchRequest.status = accept
      ? MatchRequestStatus.ACCEPTED
      : MatchRequestStatus.DECLINED;
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
        this.logger.error(
          `Failed to create session synchronously: ${(err as Error).message}`,
        );
        throw new InternalServerErrorException(
          'Could not create session. Please try again shortly.',
        );
      }

      // Best-effort fan-out: notifications/emails subscribe to match.accepted. If Rabbit is down,
      // the session is already created — log and move on.
      this.amqpConnection
        .publish('skillbridge.exchange', 'match.accepted', {
          matchRequestId: updated.id,
        })
        .catch((err) => {
          this.logger.warn(
            `Non-critical: failed to publish match.accepted: ${(err as Error).message}`,
          );
        });
    }

    // Live push so the original sender's "Sent" tab updates the moment we respond.
    this.pubSub.publish('matchRequestUpdated', {
      matchRequestUpdated: updated,
    });

    // Both sides may have new exclusions (acceptance creates a session) or new openings (decline).
    await this.invalidateSuggestionCache(updated.fromUserId, updated.toUserId);

    return updated;
  }

  async cancelMatchRequest(
    userId: string,
    requestId: string,
  ): Promise<MatchRequest> {
    const matchRequest = await this.matchRequestRepository.findOne({
      where: { id: requestId, fromUserId: userId },
    });

    if (!matchRequest) {
      throw new NotFoundException(
        'Match request not found or you are not the sender.',
      );
    }

    if (matchRequest.status !== MatchRequestStatus.PENDING) {
      throw new BadRequestException(
        'Only pending match requests can be cancelled.',
      );
    }

    matchRequest.status = MatchRequestStatus.CANCELLED;
    const updated = await this.matchRequestRepository.save(matchRequest);

    this.pubSub.publish('matchRequestUpdated', {
      matchRequestUpdated: updated,
    });

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
   * Score is bidirectional: how well their OFFER matches my WANT (60%) +
   * how well my OFFER matches their WANT (30%) + category alignment (10%).
   * Falls back to category match when embeddings aren't available.
   */
  async getSuggestedMatches(
    userId: string,
    limit = 12,
  ): Promise<SuggestedMatch[]> {
    const all = await this.computeSuggestedMatches(userId);
    return all.slice(0, limit);
  }

  async getSuggestedMatchesPaginated(
    userId: string,
    filter: SuggestedMatchesFilterInput,
  ): Promise<PaginatedSuggestedMatches> {
    const all = await this.computeSuggestedMatches(userId);
    let filtered = all;

    if (filter.category) {
      filtered = filtered.filter(
        (m) =>
          m.skill.category?.toLowerCase() === filter.category!.toLowerCase(),
      );
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.skill.title.toLowerCase().includes(q) ||
          m.skill.user?.name?.toLowerCase().includes(q) ||
          m.skill.category?.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q),
      );
    }
    if (filter.minAffinity != null) {
      filtered = filtered.filter((m) => m.score >= filter.minAffinity!);
    }

    const totalItems = filtered.length;
    const page = Math.max(1, filter.page);
    const pageLimit = Math.min(100, Math.max(1, filter.limit));
    const totalPages = Math.max(1, Math.ceil(totalItems / pageLimit));
    const skip = (page - 1) * pageLimit;
    const items = filtered.slice(skip, skip + pageLimit);

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: pageLimit,
        totalPages,
        currentPage: page,
      },
    };
  }

  private async computeSuggestedMatches(
    userId: string,
  ): Promise<SuggestedMatch[]> {
    const cacheKey = `suggested_matches_v3:${userId}`;
    const cached = await this.cacheService.get<SuggestedMatch[]>(cacheKey);
    if (cached) return cached;

    const excludedSkillIds = await this.computeExcludedSkillIds(userId);
    const excludedArray = Array.from(excludedSkillIds);
    const completedCategories = await this.computeCompletedCategories(userId);

    const userWants = await this.skillRepository.manager.query(
      `SELECT id, title, category, embedding FROM skills
       WHERE "userId" = $1 AND type = 'WANT' AND "isActive" = true
       ORDER BY "createdAt" DESC`,
      [userId],
    );

    const userOffers = await this.skillRepository.manager.query(
      `SELECT id, title, category, embedding FROM skills
       WHERE "userId" = $1 AND type = 'OFFER' AND "isActive" = true`,
      [userId],
    );

    if (!userWants || userWants.length === 0) {
      const cold = await this.skillRepository.manager.query(
        `SELECT s.*, u.name as "userName", u.id as "userId" FROM skills s
         JOIN users u ON s."userId" = u.id
         WHERE s."userId" != $1 AND s.type = 'OFFER' AND s."isActive" = true
           AND ($2::uuid[] IS NULL OR s.id != ALL($2::uuid[]))
         ORDER BY s."createdAt" DESC LIMIT 12`,
        [userId, excludedArray.length ? excludedArray : null],
      );
      const result: SuggestedMatch[] = cold.map((row: any) => ({
        id: `cold-${row.id}`,
        skill: this.rowToSkillWithUser(row),
        score: 50,
        reason:
          'Popular skill in the community — add a "Want" to your profile to get personalized matches.',
        matchedWantSkillId: undefined,
        matchedWantSkillTitle: undefined,
        reciprocalScore: 0,
        affinityBreakdown: {
          semanticScore: 0,
          categoryScore: 0,
          depthBoost: 0,
        },
      }));
      await this.cacheService.set(cacheKey, result, 300);
      return result;
    }

    // Collect candidate OFFER skills from other users that match any of my WANT skills.
    const candidates = new Map<
      string,
      { offerRow: any; wantRow: any; distance: number | null }
    >();

    for (const want of userWants) {
      let rows: any[] = [];
      if (want.embedding) {
        rows = await this.skillRepository.manager.query(
          `SELECT s.*, u.name as "userName", u.id as "userId", (s.embedding <=> $2) AS distance
           FROM skills s JOIN users u ON s."userId" = u.id
           WHERE s."userId" != $1 AND s.type = 'OFFER' AND s."isActive" = true AND s.embedding IS NOT NULL
             AND ($3::uuid[] IS NULL OR s.id != ALL($3::uuid[]))
           ORDER BY s.embedding <=> $2
           LIMIT 8`,
          [userId, want.embedding, excludedArray.length ? excludedArray : null],
        );
      }

      if (rows.length === 0) {
        rows = await this.skillRepository.manager.query(
          `SELECT s.*, u.name as "userName", u.id as "userId", NULL AS distance FROM skills s
           JOIN users u ON s."userId" = u.id
           WHERE s."userId" != $1 AND s.type = 'OFFER' AND s.category = $2 AND s."isActive" = true
             AND ($3::uuid[] IS NULL OR s.id != ALL($3::uuid[]))
           LIMIT 8`,
          [userId, want.category, excludedArray.length ? excludedArray : null],
        );
      }

      for (const row of rows) {
        if (!candidates.has(row.id)) {
          candidates.set(row.id, {
            offerRow: row,
            wantRow: want,
            distance: row.distance,
          });
        }
      }
    }

    // Batch reverse score computation: one query per candidate's userId using pgvector.
    // Build a map of userId → best reverse affinity score.
    const reverseScoreMap = new Map<string, number>();
    const otherUserIds = [
      ...new Set(Array.from(candidates.values()).map((c) => c.offerRow.userId)),
    ];

    if (otherUserIds.length > 0 && userOffers.length > 0) {
      const userOfferEmbeddings = userOffers.filter((o: any) => o.embedding);
      // Compute reverse scores in a single loop over other users (no N+1 queries).
      for (const otherUserId of otherUserIds) {
        const otherWants = await this.skillRepository.manager.query(
          `SELECT id, title, category, embedding FROM skills
           WHERE "userId" = $1 AND type = 'WANT' AND "isActive" = true`,
          [otherUserId],
        );
        if (!otherWants || otherWants.length === 0) continue;

        // Use pgvector cosine distance when both sides have embeddings, fall back to category match.
        let bestReverse = 0;
        for (const otherWant of otherWants) {
          for (const myOffer of userOffers) {
            let dist: number | null = null;
            if (myOffer.embedding && otherWant.embedding) {
              // Use pgvector operator via raw SQL for one-shot distance.
              const vecResult = await this.skillRepository.manager.query(
                `SELECT ($1::vector <=> $2::vector) AS dist`,
                [
                  typeof myOffer.embedding === 'string'
                    ? myOffer.embedding
                    : JSON.stringify(myOffer.embedding),
                  typeof otherWant.embedding === 'string'
                    ? otherWant.embedding
                    : JSON.stringify(otherWant.embedding),
                ],
              );
              dist = vecResult[0]?.dist ?? null;
            }
            const revAffinity = this.calculateAffinity(
              { category: myOffer.category, title: myOffer.title },
              otherWant,
              dist,
              new Set(),
            );
            if (revAffinity.total > bestReverse)
              bestReverse = revAffinity.total;
          }
        }
        reverseScoreMap.set(otherUserId, bestReverse);
      }
    }

    const results: SuggestedMatch[] = [];
    for (const { offerRow, wantRow, distance } of candidates.values()) {
      const forwardAffinity = this.calculateAffinity(
        offerRow,
        wantRow,
        distance,
        completedCategories,
      );

      const reverseScore = reverseScoreMap.get(offerRow.userId) ?? 0;
      const categoryScore = offerRow.category === wantRow.category ? 100 : 0;

      // Freshness bonus: newer skills get a small boost (up to +5 for skills created within the last week).
      const ageHours = offerRow.createdAt
        ? (Date.now() - new Date(offerRow.createdAt).getTime()) / 3600000
        : 9999;
      const freshnessBoost = Math.max(
        0,
        Math.round((1 - Math.min(ageHours, 168) / 168) * 5),
      );

      const total = Math.round(
        forwardAffinity.total * 0.6 +
          reverseScore * 0.3 +
          categoryScore * 0.1 +
          freshnessBoost,
      );
      const finalScore = Math.max(5, Math.min(99, total));

      const reason = this.buildReason(
        finalScore,
        forwardAffinity.total,
        reverseScore,
        wantRow.title,
        offerRow.title,
        offerRow.category,
        wantRow.category,
      );

      results.push({
        id: offerRow.id,
        skill: this.rowToSkillWithUser(offerRow),
        score: finalScore,
        reason,
        matchedWantSkillId: wantRow.id,
        matchedWantSkillTitle: wantRow.title,
        reciprocalScore: reverseScore,
        affinityBreakdown: {
          semanticScore: forwardAffinity.semantic,
          categoryScore: forwardAffinity.category,
          depthBoost: forwardAffinity.depth,
        },
      });
    }

    // Diversity sort: take at most 2 per user, interleave categories.
    const byUser = new Map<string, SuggestedMatch[]>();
    for (const r of results) {
      const uid = (r.skill as any).user?.id || 'unknown';
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid)!.push(r);
    }
    const diverse: SuggestedMatch[] = [];
    for (const [, userMatches] of byUser) {
      userMatches.sort((a, b) => b.score - a.score);
      diverse.push(...userMatches.slice(0, 2));
    }
    diverse.sort((a, b) => b.score - a.score);
    const ranked = diverse.slice(0, 20);

    await this.cacheService.set(cacheKey, ranked, 300);
    return ranked;
  }

  private rowToSkillWithUser(row: any): Skill {
    const skill = this.rowToSkill(row);
    (skill as any).user = { id: row.userId, name: row.userName };
    return skill;
  }

  private async invalidateSuggestionCache(...userIds: string[]): Promise<void> {
    await Promise.all(
      userIds
        .filter(Boolean)
        .map((id) =>
          this.cacheService
            .del(`suggested_matches_v3:${id}`)
            .catch(() => undefined),
        ),
    );
  }

  private async computeExcludedSkillIds(userId: string): Promise<Set<string>> {
    const excluded = new Set<string>();

    // Fetch all requests this user participated in, then filter by status.
    const allRequests = await this.matchRequestRepository.find({
      where: [{ fromUserId: userId }, { toUserId: userId }],
      select: ['wantedSkillId', 'offeredSkillId', 'status', 'updatedAt'],
    });
    for (const r of allRequests) {
      if (r.status === MatchRequestStatus.CANCELLED) continue;
      if (r.status === MatchRequestStatus.DECLINED && r.updatedAt) {
        const ageHours = (Date.now() - r.updatedAt.getTime()) / 3600000;
        if (ageHours > 168) continue; // declined > 7 days — re-appear in recs
      }
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

  private async computeCompletedCategories(
    userId: string,
  ): Promise<Set<string>> {
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

  private calculateAffinity(
    offer: any,
    want: any,
    distance: number | null,
    completedCategories: Set<string>,
  ): { total: number; semantic: number; category: number; depth: number } {
    const semantic =
      distance !== null
        ? Math.max(0, Math.min(100, Math.round(99 - distance * 47)))
        : 0;
    const category = offer.category === want.category ? 100 : 0;

    // Depth boost: if the user has already completed a session in this category,
    // it suggests they are "learning in depth" or seeking more advanced knowledge.
    const isReturningCategory = completedCategories.has(offer.category);
    const depth =
      offer.category === want.category && isReturningCategory ? 10 : 0;

    // Blend: 70% semantic, 25% category, 5% depth (doubled if returning)
    const total = Math.round(semantic * 0.7 + category * 0.25 + depth);

    return {
      total: Math.max(5, Math.min(99, total)),
      semantic,
      category,
      depth,
    };
  }

  private buildReason(
    score: number,
    forwardScore: number,
    reverseScore: number,
    wantTitle: string,
    offerTitle: string,
    offerCategory: string,
    wantCategory: string,
  ): string {
    const hasReverse = reverseScore >= 30;

    if (score >= 85) {
      if (hasReverse) {
        return `Great two-way fit: they teach "${offerTitle}" (you want "${wantTitle}") and your "${offerTitle}" aligns with their learning goals.`;
      }
      return `Precise match for your "${wantTitle}" goal — their expertise in "${offerTitle}" is a top-tier fit.`;
    }
    if (score >= 70) {
      if (hasReverse) {
        return `Strong mutual potential: you both want to learn and teach in overlapping areas.`;
      }
      return `Highly relevant: your "${wantTitle}" interest aligns clearly with their "${offerTitle}" offering.`;
    }
    if (offerCategory === wantCategory) {
      if (hasReverse && reverseScore >= 50) {
        return `Same domain (${offerCategory}) with decent teaching overlap — worth a conversation.`;
      }
      return `Common ground: you both focus on ${offerCategory}.`;
    }
    if (hasReverse) {
      return `Different domains but they might want what you teach — explore the fit.`;
    }
    return `Potential crossover: your "${wantTitle}" goal may benefit from their knowledge of "${offerTitle}".`;
  }

  /**
   * Cron job: runs every day at midnight to auto-decline stale pending match requests.
   * Requests older than 7 days are set to DECLINED and both parties are notified.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoDeclineStaleRequests(): Promise<void> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleRequests = await this.matchRequestRepository.find({
      where: {
        status: MatchRequestStatus.PENDING,
        createdAt: LessThan(sevenDaysAgo),
      },
      relations: ['fromUser', 'toUser', 'offeredSkill', 'wantedSkill'],
    });

    if (staleRequests.length === 0) return;

    this.logger.log(
      `Auto-declining ${staleRequests.length} stale match requests`,
    );

    for (const request of staleRequests) {
      request.status = MatchRequestStatus.DECLINED;
      await this.matchRequestRepository.save(request);

      try {
        await this.notificationService.create({
          userId: request.fromUserId,
          type: NotificationType.MATCH_EXPIRED,
          title: 'Swap request expired',
          message: `Your request to swap "${request.offeredSkill?.title}" for "${request.wantedSkill?.title}" with ${request.toUser?.name} expired after 7 days.`,
          relatedId: request.id,
        });

        await this.notificationService.create({
          userId: request.toUserId,
          type: NotificationType.MATCH_EXPIRED,
          title: 'Swap request expired',
          message: `A pending swap request from ${request.fromUser?.name} expired after 7 days.`,
          relatedId: request.id,
        });
      } catch (err) {
        this.logger.error(
          `Failed to send expiration notifications for request ${request.id}`,
          err,
        );
      }

      await this.invalidateSuggestionCache(
        request.fromUserId,
        request.toUserId,
      );
    }
  }
}
