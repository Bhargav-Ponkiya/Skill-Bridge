import {
  Controller,
  Sse,
  Param,
  Query,
  Body,
  Post,
  Get,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { AiService } from './ai.service';
import { Message } from '../message/message.entity';
import { Review } from '../review/review.entity';
import { Public } from '../../common/decorators/public.decorator';
import { Session } from '../session/session.entity';

const MIN_MESSAGES = 6;
const MIN_TOTAL_WORDS = 20;

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  @Public()
  @Sse('session/:id/summary/stream')
  streamSummary(
    @Param('id') sessionId: string,
    @Req() req: any,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const userId = req.user?.id || req.user?.sub;
          if (userId) {
            const session = await this.sessionRepository.findOne({
              where: { id: sessionId },
              select: ['id', 'participant1Id', 'participant2Id'],
            });
            if (
              session &&
              session.participant1Id !== userId &&
              session.participant2Id !== userId
            ) {
              subscriber.error(
                new UnauthorizedException(
                  'You are not a participant of this session',
                ),
              );
              return;
            }
          }
          const messages = await this.messageRepository.find({
            where: { sessionId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
          });

          const transcript = this.buildTranscript(messages);
          const wordCount = transcript
            ? transcript.split(/\s+/).filter(Boolean).length
            : 0;

          // Refuse to summarise gibberish — protects users from hallucinated recaps and saves quota.
          if (messages.length < MIN_MESSAGES || wordCount < MIN_TOTAL_WORDS) {
            subscriber.next({
              data: `Not enough chat yet to recap (${messages.length} message${
                messages.length === 1 ? '' : 's'
              }, ${wordCount} word${wordCount === 1 ? '' : 's'}). Aim for at least ${MIN_MESSAGES} substantive messages, then try again.`,
            } as MessageEvent);
            return;
          }

          const generator = this.aiService.streamSessionSummary(transcript);
          for await (const chunk of generator) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (e) {
          subscriber.error(e);
        } finally {
          subscriber.next({ data: '[DONE]' } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }

  @Public()
  @Sse('agenda')
  streamAgenda(
    @Query('offered') offeredTitle: string,
    @Query('wanted') wantedTitle: string,
    @Query('duration') durationParam: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const duration = parseInt(durationParam || '60', 10) || 60;
          const generator = this.aiService.generateAgendaStream(
            offeredTitle || 'Skill A',
            wantedTitle || 'Skill B',
            duration,
          );
          for await (const chunk of generator) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (e) {
          subscriber.error(e);
        } finally {
          subscriber.next({ data: '[DONE]' } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }

  @Public()
  @Sse('user/:userId/skill/:skillId/reviews/summary/stream')
  streamSkillReviewsSummary(
    @Param('userId') userId: string,
    @Param('skillId') skillId: string,
    @Query('title') skillTitle: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const reviews = await this.reviewRepository.find({
            where: { revieweeId: userId, skillId },
            order: { createdAt: 'DESC' },
            take: 30,
            relations: ['reviewer'],
          });

          if (reviews.length === 0) {
            subscriber.next({
              data: `No reviews yet for ${skillTitle || 'this skill'} — once partners leave reviews, a digest appears here.`,
            } as MessageEvent);
            return;
          }

          const reviewsText = reviews
            .map((r) => {
              const stars =
                '★'.repeat(r.rating) + '☆'.repeat(Math.max(0, 5 - r.rating));
              const comment = r.comment?.trim() || '(no written comment)';
              return `[${stars}] ${comment}`;
            })
            .join('\n');

          const generator = this.aiService.streamSkillReviewsSummary(
            reviewsText,
            reviews.length,
            skillTitle || 'this skill',
          );
          for await (const chunk of generator) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (e) {
          subscriber.error(e);
        } finally {
          subscriber.next({ data: '[DONE]' } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }

  @Public()
  @Sse('user/:id/reviews/summary/stream')
  streamUserReviewsSummary(
    @Param('id') userId: string,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const reviews = await this.reviewRepository.find({
            where: { revieweeId: userId },
            order: { createdAt: 'DESC' },
            take: 30,
          });

          if (reviews.length === 0) {
            subscriber.next({
              data: 'No reviews yet — once partners leave reviews, an AI digest appears here.',
            } as MessageEvent);
            return;
          }

          const reviewsText = reviews
            .map((r) => {
              const stars =
                '★'.repeat(r.rating) + '☆'.repeat(Math.max(0, 5 - r.rating));
              const comment = r.comment?.trim() || '(no written comment)';
              return `[${stars}] ${comment}`;
            })
            .join('\n');

          const generator = this.aiService.streamUserReviewsSummary(
            reviewsText,
            reviews.length,
          );
          for await (const chunk of generator) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (e) {
          subscriber.error(e);
        } finally {
          subscriber.next({ data: '[DONE]' } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }

  private buildTranscript(messages: Message[]): string {
    return messages
      .map((m) => {
        const who = m.sender?.name?.trim() || `User ${m.senderId.slice(0, 4)}`;
        return `${who}: ${m.content}`;
      })
      .join('\n');
  }

  @Public()
  @Sse('session/:id/takeaways/stream')
  streamTakeaways(
    @Param('id') sessionId: string,
    @Query('notes') notes: string,
    @Req() req: any,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const userId = req.user?.id || req.user?.sub;
          if (userId) {
            const sessionCheck = await this.sessionRepository.findOne({
              where: { id: sessionId },
              select: ['id', 'participant1Id', 'participant2Id'],
            });
            if (
              sessionCheck &&
              sessionCheck.participant1Id !== userId &&
              sessionCheck.participant2Id !== userId
            ) {
              subscriber.error(
                new UnauthorizedException(
                  'You are not a participant of this session',
                ),
              );
              return;
            }
          }

          if (!notes || notes.trim().length < 5) {
            subscriber.next({
              data: 'Please add a few more notes so the AI can generate meaningful takeaways.',
            } as MessageEvent);
            return;
          }

          const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['skill1', 'skill2'],
          });

          if (!session) {
            subscriber.next({ data: 'Session not found.' } as MessageEvent);
            return;
          }

          const skillTitles = [
            session.skill1?.title,
            session.skill2?.title,
          ].filter(Boolean) as string[];

          const generator = this.aiService.streamTakeaways(notes, skillTitles);
          for await (const chunk of generator) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (e) {
          subscriber.error(e);
        } finally {
          subscriber.next({ data: '[DONE]' } as MessageEvent);
          subscriber.complete();
        }
      })();
    });
  }

  @Public()
  @Get('icebreaker')
  async getIcebreaker(
    @Query('wanted') wantedSkill: string,
    @Query('offered') offeredSkill: string,
    @Query('partner') partnerName: string,
  ): Promise<{ message: string }> {
    const message = await this.aiService.generateIcebreaker(
      wantedSkill || 'a new skill',
      offeredSkill || 'another skill',
      partnerName || 'partner',
    );
    return { message };
  }
}
