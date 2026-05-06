import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, OnApplicationBootstrap, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PubSub } from 'graphql-subscriptions';
import { Session, SessionStatus } from './session.entity';
import { UpdateSessionInput } from './dto/update-session.input';
import { MatchRequest, MatchRequestStatus } from '../match/match-request.entity';
import { AiService } from '../ai/ai.service';
import { Skill } from '../skill/skill.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.entity';

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
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
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

    if (session.version !== input.version) {
      throw new ConflictException('Session was updated by your partner. Please refresh.');
    }

    if (
      session.status === SessionStatus.ACTIVE ||
      session.status === SessionStatus.COMPLETED ||
      session.status === SessionStatus.REVIEWED
    ) {
      throw new BadRequestException('Logistics cannot be changed once the session has started.');
    }

    // CON-1: Double-booking prevention — if scheduledAt changes, ensure neither participant
    // has another SCHEDULED or ACTIVE session within +/- 60 minutes.
    if (input.scheduledAt) {
      const proposedTime = new Date(input.scheduledAt);
      const windowStart = new Date(proposedTime.getTime() - 60 * 60 * 1000);
      const windowEnd = new Date(proposedTime.getTime() + 60 * 60 * 1000);

      const conflicting = await this.sessionRepository
        .createQueryBuilder('s')
        .where(
          '(s.participant1Id = :p1 OR s.participant2Id = :p1 OR s.participant1Id = :p2 OR s.participant2Id = :p2)',
          { p1: session.participant1Id, p2: session.participant2Id },
        )
        .andWhere('s.id != :currentId', { currentId: sessionId })
        .andWhere('s.status IN (:...statuses)', {
          statuses: [SessionStatus.SCHEDULED, SessionStatus.ACTIVE],
        })
        .andWhere('s."scheduledAt" IS NOT NULL')
        .andWhere('s."scheduledAt" BETWEEN :start AND :end', {
          start: windowStart,
          end: windowEnd,
        })
        .getOne();

      if (conflicting) {
        throw new ConflictException('Time slot is double-booked');
      }
    }

    const wasNegotiating = session.status === SessionStatus.NEGOTIATING;
    Object.assign(session, input);

    if (
      session.status === SessionStatus.NEGOTIATING &&
      session.scheduledAt &&
      session.format
    ) {
      session.status = SessionStatus.SCHEDULED;
    }

    const saved = await this.saveAndBroadcast(session);

    const partnerId = session.participant1Id === userId ? session.participant2Id : session.participant1Id;

    if (input.scheduledAt || input.format) {
      await this.notificationService.create({
        userId: partnerId,
        type: NotificationType.MATCH_ACCEPTED,
        title: 'Session Updated',
        message: 'Your partner updated the session logistics.',
        relatedId: sessionId,
      });
    } else if (wasNegotiating && session.status === SessionStatus.SCHEDULED) {
      await this.notificationService.create({
        userId: partnerId,
        type: NotificationType.MATCH_ACCEPTED,
        title: 'Session Scheduled',
        message: `Your session is now ${SessionStatus.SCHEDULED}.`,
        relatedId: sessionId,
      });
    }

    return saved;
  }

  async advanceSessionStatus(
    userId: string,
    sessionId: string,
    targetStatus: SessionStatus,
  ): Promise<Session> {
    const session = await this.getSession(userId, sessionId);

    const allowed: Record<SessionStatus, SessionStatus[]> = {
      [SessionStatus.NEGOTIATING]: [SessionStatus.SCHEDULED, SessionStatus.ACTIVE, SessionStatus.CANCELLED],
      [SessionStatus.SCHEDULED]: [SessionStatus.ACTIVE, SessionStatus.NEGOTIATING, SessionStatus.CANCELLED],
      [SessionStatus.ACTIVE]: [SessionStatus.COMPLETED, SessionStatus.CANCELLED],
      [SessionStatus.COMPLETED]: [SessionStatus.REVIEWED],
      [SessionStatus.REVIEWED]: [],
      [SessionStatus.CANCELLED]: [],
    };

    if (!allowed[session.status]?.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition session from ${session.status} to ${targetStatus}.`,
      );
    }

    // CON-2: Cannot move to ACTIVE without a scheduled time.
    if (targetStatus === SessionStatus.ACTIVE && !session.scheduledAt) {
      throw new BadRequestException('Session must be scheduled before it can be started.');
    }

    session.status = targetStatus;
    const saved = await this.saveAndBroadcast(session);

    const partnerId = session.participant1Id === userId ? session.participant2Id : session.participant1Id;
    await this.notificationService.create({
      userId: partnerId,
      type: targetStatus === SessionStatus.ACTIVE ? NotificationType.SESSION_REMINDER : NotificationType.SESSION_COMPLETED,
      title: 'Status Changed',
      message: `Your session is now ${targetStatus}.`,
      relatedId: sessionId,
    });

    return saved;
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

    const partnerId = session.participant1Id === userId ? session.participant2Id : session.participant1Id;

    if (session.p1Completed && session.p2Completed) {
      session.status = SessionStatus.COMPLETED;
      // Fire and forget: generate AI insights in the background.
      this.generatePostSessionInsights(session.id).catch((err) =>
        this.logger.error(`Failed to generate insights for session ${session.id}`, err),
      );
      await this.saveAndBroadcast(session);
      await this.notificationService.create({
        userId: partnerId,
        type: NotificationType.SESSION_COMPLETED,
        title: 'Session Completed',
        message: 'Your session is now COMPLETED.',
        relatedId: sessionId,
      });
    } else if (session.status === SessionStatus.SCHEDULED) {
      // Once at least one side flips, treat the exchange as in flight.
      session.status = SessionStatus.ACTIVE;
      await this.saveAndBroadcast(session);
      await this.notificationService.create({
        userId: partnerId,
        type: NotificationType.SESSION_REMINDER,
        title: 'Session Active',
        message: 'Your partner marked their part complete. Session is now ACTIVE.',
        relatedId: sessionId,
      });
    } else {
      await this.saveAndBroadcast(session);
      const myCompletion = session.participant1Id === userId ? session.p1Completed : session.p2Completed;
      await this.notificationService.create({
        userId: partnerId,
        type: NotificationType.MATCH_ACCEPTED,
        title: 'Progress Update',
        message: myCompletion
          ? 'Your partner marked their part complete.'
          : 'Your partner undone their completion.',
        relatedId: sessionId,
      });
    }

    return session;
  }

  async cancelSession(userId: string, sessionId: string, reason: string): Promise<Session> {
    const session = await this.getSession(userId, sessionId);

    if (
      session.status !== SessionStatus.NEGOTIATING &&
      session.status !== SessionStatus.SCHEDULED
    ) {
      throw new BadRequestException('Only negotiating or scheduled sessions can be cancelled.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      session.status = SessionStatus.CANCELLED;
      session.summary = reason || 'Session cancelled by user.';

      const saved = await queryRunner.manager.save(session);

      const partnerId = session.participant1Id === userId ? session.participant2Id : session.participant1Id;
      await this.notificationService.create({
        userId: partnerId,
        type: NotificationType.SESSION_COMPLETED,
        title: 'Session Cancelled',
        message: reason || 'Your partner cancelled the session.',
        relatedId: sessionId,
      });

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cron job: runs every day at midnight to auto-cancel stale negotiating sessions.
   * Sessions stuck in NEGOTIATING for more than 14 days are cancelled and both parties notified.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoCancelStaleSessions(): Promise<void> {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const staleSessions = await this.sessionRepository.find({
      where: {
        status: SessionStatus.NEGOTIATING,
        updatedAt: new Date(fourteenDaysAgo.toISOString()),
      },
      relations: ['participant1', 'participant2'],
    });

    if (staleSessions.length === 0) return;

    this.logger.log(`Auto-cancelling ${staleSessions.length} stale negotiating sessions`);

    for (const session of staleSessions) {
      session.status = SessionStatus.CANCELLED;
      session.summary = 'Auto-cancelled: session inactive for 14 days.';
      await this.sessionRepository.save(session);

      try {
        await this.notificationService.create({
          userId: session.participant1Id,
          type: NotificationType.SESSION_COMPLETED,
          title: 'Session expired',
          message: `Your session with ${session.participant2?.name ?? 'your partner'} was auto-cancelled after 14 days of inactivity.`,
          relatedId: session.id,
        });

        await this.notificationService.create({
          userId: session.participant2Id,
          type: NotificationType.SESSION_COMPLETED,
          title: 'Session expired',
          message: `Your session with ${session.participant1?.name ?? 'your partner'} was auto-cancelled after 14 days of inactivity.`,
          relatedId: session.id,
        });
      } catch (err) {
        this.logger.error(`Failed to send expiration notifications for session ${session.id}`, err);
      }
    }
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
