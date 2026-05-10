import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { Session, SessionStatus } from './session.entity';
import { MatchRequest } from '../match/match-request.entity';
import { User } from '../user/user.entity';
import { Skill } from '../skill/skill.entity';
import { AiService } from '../ai/ai.service';
import { NotificationService } from '../notification/notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PubSub } from 'graphql-subscriptions';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepo: jest.Mocked<Repository<Session>>;
  let matchRequestRepo: jest.Mocked<Repository<MatchRequest>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;
  let notificationService: jest.Mocked<NotificationService>;
  let pubSub: jest.Mocked<PubSub>;

  const mockUserId = 'user-1';
  const mockPartnerId = 'user-2';
  const mockSessionId = 'session-1';

  const makeSession = (overrides: Partial<Session> = {}): Session =>
    Object.assign(new Session(), {
      id: mockSessionId,
      matchRequestId: 'mr-1',
      participant1Id: mockUserId,
      participant2Id: mockPartnerId,
      skill1Id: 'skill-1',
      skill2Id: 'skill-2',
      status: SessionStatus.NEGOTIATING,
      p1Completed: false,
      p2Completed: false,
      version: 1,
      scheduledAt: null,
      duration: null,
      format: null,
      meetingLink: null,
      summary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as Session);

  beforeEach(async () => {
    sessionRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<Session>>;

    matchRequestRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<MatchRequest>>;

    userRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    dataSource = {
      query: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    notificationService = {
      create: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    pubSub = {
      publish: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PubSub>;

    const aiService = {} as jest.Mocked<AiService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        {
          provide: getRepositoryToken(MatchRequest),
          useValue: matchRequestRepo,
        },
        { provide: getRepositoryToken(Skill), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: 'PUB_SUB', useValue: pubSub },
        { provide: AiService, useValue: aiService },
        { provide: NotificationService, useValue: notificationService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSessionFromMatch', () => {
    it('creates a NEGOTIATING session and broadcasts', async () => {
      const created = makeSession();
      sessionRepo.create.mockReturnValue(created);
      sessionRepo.save.mockResolvedValue(created);

      const result = await service.createSessionFromMatch(
        'mr-1',
        mockUserId,
        mockPartnerId,
        'skill-1',
        'skill-2',
      );

      expect(sessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: SessionStatus.NEGOTIATING }),
      );
      expect(sessionRepo.save).toHaveBeenCalledWith(created);
      expect(pubSub.publish).toHaveBeenCalledWith('sessionUpdated', {
        sessionUpdated: created,
      });
      expect(result.status).toBe(SessionStatus.NEGOTIATING);
    });
  });

  describe('getSession', () => {
    it('returns session when user is participant1', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);

      const result = await service.getSession(mockUserId, mockSessionId);
      expect(result).toEqual(session);
    });

    it('returns session when user is participant2', async () => {
      const session = makeSession({
        participant1Id: mockPartnerId,
        participant2Id: mockUserId,
      });
      sessionRepo.findOne.mockResolvedValue(session);

      const result = await service.getSession(mockUserId, mockSessionId);
      expect(result).toEqual(session);
    });

    it('throws NotFoundException when session does not exist', async () => {
      sessionRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getSession(mockUserId, mockSessionId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when user is not a participant', async () => {
      const session = makeSession();
      sessionRepo.findOne.mockResolvedValue(session);
      await expect(
        service.getSession('stranger', mockSessionId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMySessions', () => {
    it('returns sessions ordered by createdAt DESC', async () => {
      const sessions = [
        makeSession({ status: SessionStatus.ACTIVE }),
        makeSession({ id: 's2' }),
      ];
      sessionRepo.find.mockResolvedValue(sessions);

      const result = await service.getMySessions(mockUserId);
      expect(sessionRepo.find).toHaveBeenCalledWith({
        where: [{ participant1Id: mockUserId }, { participant2Id: mockUserId }],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(sessions);
    });
  });

  describe('updateSessionDetails', () => {
    it('throws ForbiddenException for guest users', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: true } as User);
      await expect(
        service.updateSessionDetails(mockUserId, mockSessionId, {
          version: 1,
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on version mismatch', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(makeSession({ version: 2 }));
      await expect(
        service.updateSessionDetails(mockUserId, mockSessionId, {
          version: 1,
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when session is ACTIVE', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.ACTIVE, version: 1 }),
      );
      await expect(
        service.updateSessionDetails(mockUserId, mockSessionId, {
          version: 1,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when session is COMPLETED', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.COMPLETED, version: 1 }),
      );
      await expect(
        service.updateSessionDetails(mockUserId, mockSessionId, {
          version: 1,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on double-booking overlap', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValue(session);

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'conflicting-session' }),
      };
      sessionRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.updateSessionDetails(mockUserId, mockSessionId, {
          version: 1,
          scheduledAt: new Date('2026-06-01T10:00:00Z'),
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('auto-promotes NEGOTIATING to SCHEDULED when scheduledAt + format are set', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValue(session);

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      sessionRepo.createQueryBuilder.mockReturnValue(qb);
      sessionRepo.save.mockResolvedValue({
        ...session,
        status: SessionStatus.SCHEDULED,
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
        format: 'VIDEO' as any,
      });

      const result = await service.updateSessionDetails(
        mockUserId,
        mockSessionId,
        {
          version: 1,
          scheduledAt: new Date('2026-06-01T10:00:00Z'),
          format: 'VIDEO',
        },
      );

      expect(result.status).toBe(SessionStatus.SCHEDULED);
      expect(pubSub.publish).toHaveBeenCalled();
    });

    it('notifies partner on logistics change', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValue(session);

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      sessionRepo.createQueryBuilder.mockReturnValue(qb);
      sessionRepo.save.mockResolvedValue({
        ...session,
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
      });

      await service.updateSessionDetails(mockUserId, mockSessionId, {
        version: 1,
        scheduledAt: new Date('2026-06-01T10:00:00Z'),
      });

      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockPartnerId,
          title: 'Session Updated',
        }),
      );
    });

    it('allows updates when no double-booking conflict', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValue(session);

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      sessionRepo.createQueryBuilder.mockReturnValue(qb);
      const saved = {
        ...session,
        meetingLink: 'https://meet.google.com/abc',
        version: 2,
      };
      sessionRepo.save.mockResolvedValue(saved);

      const result = await service.updateSessionDetails(
        mockUserId,
        mockSessionId,
        {
          version: 1,
          meetingLink: 'https://meet.google.com/abc',
        },
      );

      expect(result.meetingLink).toBe('https://meet.google.com/abc');
    });
  });

  describe('advanceSessionStatus', () => {
    it('throws ForbiddenException for guest users', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: true } as User);
      await expect(
        service.advanceSessionStatus(
          mockUserId,
          mockSessionId,
          SessionStatus.ACTIVE,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for invalid transitions (NEGOTIATING -> COMPLETED)', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.NEGOTIATING }),
      );
      await expect(
        service.advanceSessionStatus(
          mockUserId,
          mockSessionId,
          SessionStatus.COMPLETED,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for transitions from REVIEWED', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.REVIEWED }),
      );
      await expect(
        service.advanceSessionStatus(
          mockUserId,
          mockSessionId,
          SessionStatus.ACTIVE,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for transitions from CANCELLED', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.CANCELLED }),
      );
      await expect(
        service.advanceSessionStatus(
          mockUserId,
          mockSessionId,
          SessionStatus.ACTIVE,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions NEGOTIATING -> ACTIVE successfully', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = { ...session, status: SessionStatus.ACTIVE, version: 2 };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.ACTIVE,
      );

      expect(result.status).toBe(SessionStatus.ACTIVE);
      expect(pubSub.publish).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SESSION_REMINDER' }),
      );
    });

    it('transitions NEGOTIATING -> SCHEDULED via advanceSessionStatus', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = {
        ...session,
        status: SessionStatus.SCHEDULED,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.SCHEDULED,
      );
      expect(result.status).toBe(SessionStatus.SCHEDULED);
    });

    it('transitions SCHEDULED -> NEGOTIATING (back to negotiating)', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.SCHEDULED,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = {
        ...session,
        status: SessionStatus.NEGOTIATING,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.NEGOTIATING,
      );
      expect(result.status).toBe(SessionStatus.NEGOTIATING);
    });

    it('transitions SCHEDULED -> ACTIVE', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.SCHEDULED,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = { ...session, status: SessionStatus.ACTIVE, version: 2 };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.ACTIVE,
      );
      expect(result.status).toBe(SessionStatus.ACTIVE);
    });

    it('sets scheduledAt to now when transitioning to ACTIVE without scheduledAt', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.SCHEDULED,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = {
        ...session,
        status: SessionStatus.ACTIVE,
        scheduledAt: new Date(),
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.ACTIVE,
      );

      expect(session.scheduledAt).toBeDefined();
    });

    it('transitions ACTIVE -> COMPLETED', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({ status: SessionStatus.ACTIVE, version: 1 });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = {
        ...session,
        status: SessionStatus.COMPLETED,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.COMPLETED,
      );
      expect(result.status).toBe(SessionStatus.COMPLETED);
    });

    it('transitions COMPLETED -> REVIEWED', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.COMPLETED,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = {
        ...session,
        status: SessionStatus.REVIEWED,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(updated);

      const result = await service.advanceSessionStatus(
        mockUserId,
        mockSessionId,
        SessionStatus.REVIEWED,
      );
      expect(result.status).toBe(SessionStatus.REVIEWED);
    });

    it('throws BadRequestException for ACTIVE -> NEGOTIATING (not allowed)', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.ACTIVE }),
      );
      await expect(
        service.advanceSessionStatus(
          mockUserId,
          mockSessionId,
          SessionStatus.NEGOTIATING,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on version mismatch', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.NEGOTIATING, version: 1 }),
      );
      dataSource.query.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.advanceSessionStatus(
          mockUserId,
          mockSessionId,
          SessionStatus.ACTIVE,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('toggleSessionProgress', () => {
    it('throws ForbiddenException for guest users', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: true } as User);
      await expect(
        service.toggleSessionProgress(mockUserId, mockSessionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if session is not SCHEDULED or ACTIVE', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.NEGOTIATING }),
      );
      await expect(
        service.toggleSessionProgress(mockUserId, mockSessionId),
      ).rejects.toThrow(BadRequestException);
    });

    it('toggles p1Completed for participant1', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.ACTIVE,
        p1Completed: false,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = { ...session, p1Completed: true, version: 2 };
      sessionRepo.findOne.mockResolvedValueOnce(updated);
      sessionRepo.save.mockResolvedValue(updated);

      const result = await service.toggleSessionProgress(
        mockUserId,
        mockSessionId,
      );

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"p1Completed"'),
        [mockSessionId, 1],
      );
      expect(result.p1Completed).toBe(true);
    });

    it('toggles p2Completed for participant2', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.ACTIVE,
        p2Completed: false,
        version: 1,
        participant1Id: mockPartnerId,
        participant2Id: mockUserId,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = { ...session, p2Completed: true, version: 2 };
      sessionRepo.findOne.mockResolvedValueOnce(updated);
      sessionRepo.save.mockResolvedValue(updated);

      const result = await service.toggleSessionProgress(
        mockUserId,
        mockSessionId,
      );

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"p2Completed"'),
        [mockSessionId, 1],
      );
      expect(result.p2Completed).toBe(true);
    });

    it('auto-promotes to COMPLETED when both sides are done', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.ACTIVE,
        p1Completed: false,
        p2Completed: true,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query
        .mockResolvedValueOnce({ rowCount: 1 }) // toggle p1Completed
        .mockResolvedValueOnce(undefined); // swapCount update
      const bothDone = {
        ...session,
        p1Completed: true,
        p2Completed: true,
        status: SessionStatus.ACTIVE,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(bothDone);
      sessionRepo.save.mockResolvedValue({
        ...bothDone,
        status: SessionStatus.COMPLETED,
      });

      const result = await service.toggleSessionProgress(
        mockUserId,
        mockSessionId,
      );

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(notificationService.create).toHaveBeenCalledTimes(2);
    });

    it('auto-promotes SCHEDULED to ACTIVE when other user toggles first', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.SCHEDULED,
        p1Completed: false,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const afterToggle = {
        ...session,
        p1Completed: true,
        status: SessionStatus.SCHEDULED,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(afterToggle);
      sessionRepo.save.mockResolvedValue({
        ...afterToggle,
        status: SessionStatus.ACTIVE,
      });

      const result = await service.toggleSessionProgress(
        mockUserId,
        mockSessionId,
      );

      expect(result.status).toBe(SessionStatus.ACTIVE);
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SESSION_REMINDER' }),
      );
    });

    it('notifies partner of progress update', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.ACTIVE,
        p1Completed: false,
        p2Completed: true,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const updated = {
        ...session,
        p1Completed: true,
        p2Completed: true,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(updated);
      sessionRepo.save.mockResolvedValue(updated);

      await service.toggleSessionProgress(mockUserId, mockSessionId);

      expect(notificationService.create).toHaveBeenCalled();
    });

    it('throws ConflictException on version mismatch', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.ACTIVE, version: 1 }),
      );
      dataSource.query.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.toggleSessionProgress(mockUserId, mockSessionId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelSession', () => {
    it('throws ForbiddenException for guest users', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: true } as User);
      await expect(
        service.cancelSession(
          mockUserId,
          mockSessionId,
          'No longer interested',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if session is ACTIVE', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.ACTIVE }),
      );
      await expect(
        service.cancelSession(mockUserId, mockSessionId, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if session is COMPLETED', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.COMPLETED }),
      );
      await expect(
        service.cancelSession(mockUserId, mockSessionId, 'reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancels a NEGOTIATING session', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const cancelled = {
        ...session,
        status: SessionStatus.CANCELLED,
        summary: 'Test reason',
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(cancelled);

      const result = await service.cancelSession(
        mockUserId,
        mockSessionId,
        'Test reason',
      );

      expect(result.status).toBe(SessionStatus.CANCELLED);
      expect(result.summary).toBe('Test reason');
      expect(pubSub.publish).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'SESSION_CANCELLED' }),
      );
    });

    it('cancels a SCHEDULED session', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.SCHEDULED,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const cancelled = {
        ...session,
        status: SessionStatus.CANCELLED,
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(cancelled);

      const result = await service.cancelSession(mockUserId, mockSessionId, '');
      expect(result.status).toBe(SessionStatus.CANCELLED);
    });

    it('uses default reason when empty string provided', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      const session = makeSession({
        status: SessionStatus.NEGOTIATING,
        version: 1,
      });
      sessionRepo.findOne.mockResolvedValueOnce(session);
      dataSource.query.mockResolvedValue({ rowCount: 1 });
      const cancelled = {
        ...session,
        status: SessionStatus.CANCELLED,
        summary: 'Session cancelled by user.',
        version: 2,
      };
      sessionRepo.findOne.mockResolvedValueOnce(cancelled);

      const result = await service.cancelSession(mockUserId, mockSessionId, '');
      expect(result.summary).toBe('Session cancelled by user.');
    });

    it('throws ConflictException on version mismatch', async () => {
      userRepo.findOne.mockResolvedValue({ isGuest: false } as User);
      sessionRepo.findOne.mockResolvedValue(
        makeSession({ status: SessionStatus.NEGOTIATING, version: 1 }),
      );
      dataSource.query.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.cancelSession(mockUserId, mockSessionId, 'reason'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('autoCancelStaleSessions', () => {
    it('does nothing when no stale sessions', async () => {
      sessionRepo.find.mockResolvedValue([]);
      await service.autoCancelStaleSessions();
      expect(sessionRepo.save).not.toHaveBeenCalled();
    });

    it('cancels sessions older than 14 days in NEGOTIATING status', async () => {
      const stale = makeSession({
        status: SessionStatus.NEGOTIATING,
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });
      stale.participant1 = { id: mockUserId, name: 'User1' } as User;
      stale.participant2 = { id: mockPartnerId, name: 'User2' } as User;
      sessionRepo.find.mockResolvedValue([stale]);
      sessionRepo.save.mockResolvedValue({
        ...stale,
        status: SessionStatus.CANCELLED,
      });

      await service.autoCancelStaleSessions();

      expect(sessionRepo.save).toHaveBeenCalled();
      expect(stale.status).toBe(SessionStatus.CANCELLED);
      expect(stale.summary).toBe(
        'Auto-cancelled: session inactive for 14 days.',
      );
      expect(notificationService.create).toHaveBeenCalledTimes(2);
    });

    it('handles missing participant names gracefully', async () => {
      const stale = makeSession({
        status: SessionStatus.NEGOTIATING,
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });
      stale.participant1 = { id: mockUserId } as User;
      stale.participant2 = { id: mockPartnerId } as User;
      sessionRepo.find.mockResolvedValue([stale]);
      sessionRepo.save.mockResolvedValue(stale);

      await service.autoCancelStaleSessions();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('continues processing other sessions when notification fails', async () => {
      const stale1 = makeSession({
        id: 's1',
        status: SessionStatus.NEGOTIATING,
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      });
      stale1.participant1 = { id: mockUserId } as User;
      stale1.participant2 = { id: mockPartnerId } as User;
      const stale2 = makeSession({
        id: 's2',
        status: SessionStatus.NEGOTIATING,
        updatedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
      });
      stale2.participant1 = { id: 'u3' } as User;
      stale2.participant2 = { id: 'u4' } as User;

      // Both notifications for stale1 are in ONE try/catch, so if the first fails,
      // the second is skipped. stale2's two notifications should still fire.
      notificationService.create
        .mockRejectedValueOnce(new Error('db error'));

      sessionRepo.find.mockResolvedValue([stale1, stale2]);
      sessionRepo.save.mockResolvedValue(stale1);

      await service.autoCancelStaleSessions();

      expect(notificationService.create).toHaveBeenCalledTimes(3);
    });
  });
});
