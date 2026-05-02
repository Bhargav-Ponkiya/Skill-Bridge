import { Injectable, NotFoundException, BadRequestException, Logger, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PubSub } from 'graphql-subscriptions';
import { Session, SessionStatus } from './session.entity';
import { UpdateSessionInput } from './dto/update-session.input';
import { MatchRequest, MatchRequestStatus } from '../match/match-request.entity';
import { AiService } from '../ai/ai.service';
import { Skill } from '../skill/skill.entity';

@Injectable()
export class SessionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(MatchRequest)
    private matchRequestRepository: Repository<MatchRequest>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
    private readonly aiService: AiService,
  ) {}

  private async saveAndBroadcast(session: Session): Promise<Session> {
    const saved = await this.sessionRepository.save(session);
    this.pubSub.publish('sessionUpdated', { sessionUpdated: saved });
    return saved;
  }

  /**
   * Backfill: for any ACCEPTED match request that doesn't have a session yet (for example
   * because RabbitMQ wasn't running when it was accepted), create one. Runs once on boot.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      const orphans = await this.matchRequestRepository
        .createQueryBuilder('mr')
        .leftJoin(Session, 's', 's.matchRequestId = mr.id')
        .where('mr.status = :status', { status: MatchRequestStatus.ACCEPTED })
        .andWhere('s.id IS NULL')
        .getMany();

      if (orphans.length === 0) return;

      this.logger.log(`Backfilling ${orphans.length} session(s) for already-accepted match requests…`);

      for (const mr of orphans) {
        const session = this.sessionRepository.create({
          matchRequestId: mr.id,
          participant1Id: mr.fromUserId,
          participant2Id: mr.toUserId,
          skill1Id: mr.offeredSkillId,
          skill2Id: mr.wantedSkillId,
          status: SessionStatus.NEGOTIATING,
        });
        await this.sessionRepository.save(session);
      }
    } catch (err) {
      this.logger.warn(`Session backfill skipped: ${(err as Error).message}`);
    }
  }

  async createSessionFromMatch(
    matchRequestId: string,
    participant1Id: string,
    participant2Id: string,
    skill1Id: string,
    skill2Id: string,
  ): Promise<Session> {
    const session = this.sessionRepository.create({
      matchRequestId,
      participant1Id,
      participant2Id,
      skill1Id,
      skill2Id,
      status: SessionStatus.NEGOTIATING,
    });
    return this.saveAndBroadcast(session);
  }

  async getSession(userId: string, sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    if (session.participant1Id !== userId && session.participant2Id !== userId) {
      throw new BadRequestException('You do not have access to this session');
    }
    return session;
  }

  async getMySessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: [{ participant1Id: userId }, { participant2Id: userId }],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Updating scheduling details. Once scheduledAt + format are set, NEGOTIATING auto-promotes to SCHEDULED.
   */
  async updateSessionDetails(
    userId: string,
    sessionId: string,
    input: UpdateSessionInput,
  ): Promise<Session> {
    const session = await this.getSession(userId, sessionId);
    Object.assign(session, input);

    if (
      session.status === SessionStatus.NEGOTIATING &&
      session.scheduledAt &&
      session.format
    ) {
      session.status = SessionStatus.SCHEDULED;
    }

    return this.saveAndBroadcast(session);
  }

  async advanceSessionStatus(
    userId: string,
    sessionId: string,
    targetStatus: SessionStatus,
  ): Promise<Session> {
    const session = await this.getSession(userId, sessionId);

    const allowed: Record<SessionStatus, SessionStatus[]> = {
      [SessionStatus.NEGOTIATING]: [SessionStatus.SCHEDULED, SessionStatus.ACTIVE],
      [SessionStatus.SCHEDULED]: [SessionStatus.ACTIVE, SessionStatus.NEGOTIATING],
      [SessionStatus.ACTIVE]: [SessionStatus.COMPLETED],
      [SessionStatus.COMPLETED]: [SessionStatus.REVIEWED],
      [SessionStatus.REVIEWED]: [],
    };

    if (!allowed[session.status]?.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition session from ${session.status} to ${targetStatus}.`,
      );
    }

    session.status = targetStatus;
    return this.saveAndBroadcast(session);
  }

  /**
   * Each participant can flip their own "I taught my part" flag. When both are done, the
   * session auto-promotes from ACTIVE → COMPLETED so reviews can unlock.
   */
  async toggleSessionProgress(userId: string, sessionId: string): Promise<Session> {
    const session = await this.getSession(userId, sessionId);

    if (session.status !== SessionStatus.ACTIVE && session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException('Session must be scheduled or active to mark progress.');
    }

    if (session.participant1Id === userId) {
      session.p1Completed = !session.p1Completed;
    } else if (session.participant2Id === userId) {
      session.p2Completed = !session.p2Completed;
    }

    if (session.p1Completed && session.p2Completed) {
      session.status = SessionStatus.COMPLETED;
      // Fire and forget: generate AI insights in the background.
      this.generatePostSessionInsights(session.id).catch((err) =>
        this.logger.error(`Failed to generate insights for session ${session.id}`, err),
      );
    } else if (session.status === SessionStatus.SCHEDULED) {
      // Once at least one side flips, treat the exchange as in flight.
      session.status = SessionStatus.ACTIVE;
    }

    return this.saveAndBroadcast(session);
  }

  private async generatePostSessionInsights(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['skill1', 'skill2'],
    });
    if (!session || !session.skill1 || !session.skill2) return;

    this.logger.log(`Starting AI insight generation for session ${sessionId}...`);
    const start = Date.now();
    // In a real swap, both users are teaching and learning.
    const [insights1, insights2] = await Promise.all([
      this.aiService.generateLearningInsights(session.skill1.title, session.skill1.proficiencyLevel || 'INTERMEDIATE'),
      this.aiService.generateLearningInsights(session.skill2.title, session.skill2.proficiencyLevel || 'INTERMEDIATE'),
    ]);

    session.roadmap = `### For ${session.skill1.title}:\n${insights1.roadmap}\n\n### For ${session.skill2.title}:\n${insights2.roadmap}`;
    session.suggestedResources = {
      [session.skill1.title]: insights1.resources,
      [session.skill2.title]: insights2.resources,
    };

    await this.saveAndBroadcast(session);
    this.logger.log(`Finished AI insights for ${sessionId} in ${Date.now() - start}ms.`);
  }
}
