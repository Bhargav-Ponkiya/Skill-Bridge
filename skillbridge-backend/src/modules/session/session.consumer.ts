import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchRequest } from '../match/match-request.entity';
import { Session, SessionStatus } from './session.entity';

@Injectable()
export class SessionConsumer {
  private readonly logger = new Logger(SessionConsumer.name);

  constructor(
    @InjectRepository(MatchRequest)
    private readonly matchRequestRepository: Repository<MatchRequest>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Idempotent fallback. Sessions are created synchronously in MatchService when a request is
   * accepted, but if that path didn't run (older data, manual replay) we still ensure a
   * session exists when the broker eventually delivers `match.accepted`.
   */
  @RabbitSubscribe({
    exchange: 'skillbridge.exchange',
    routingKey: 'match.accepted',
    queue: 'session-creation-queue',
  })
  public async handleMatchAccepted(msg: { matchRequestId: string }) {
    this.logger.log(`Handling match.accepted event for match request ID: ${msg.matchRequestId}`);

    const existing = await this.sessionRepository.findOne({
      where: { matchRequestId: msg.matchRequestId },
    });
    if (existing) {
      this.logger.log(`Session already exists for matchRequestId=${msg.matchRequestId}; skipping.`);
      return;
    }

    const matchRequest = await this.matchRequestRepository.findOne({
      where: { id: msg.matchRequestId },
    });
    if (!matchRequest) {
      this.logger.warn(`No match request found for id=${msg.matchRequestId}`);
      return;
    }

    try {
      const session = this.sessionRepository.create({
        matchRequestId: matchRequest.id,
        participant1Id: matchRequest.fromUserId,
        participant2Id: matchRequest.toUserId,
        skill1Id: matchRequest.offeredSkillId,
        skill2Id: matchRequest.wantedSkillId,
        status: SessionStatus.NEGOTIATING,
      });
      await this.sessionRepository.save(session);
      this.logger.log(`Created session via consumer fallback for matchRequestId=${msg.matchRequestId}`);
    } catch (e) {
      this.logger.error(`Failed to create session in consumer fallback: ${(e as Error).message}`);
    }
  }
}
