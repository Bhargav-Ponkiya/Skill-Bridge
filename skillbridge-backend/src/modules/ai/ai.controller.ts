import { Controller, Sse, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable } from 'rxjs';
import { AiService } from './ai.service';
import { Message } from '../message/message.entity';
import { Review } from '../review/review.entity';
import { Public } from '../../common/decorators/public.decorator';

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
  ) {}

  @Public()
  @Sse('session/:id/summary/stream')
  streamSummary(@Param('id') sessionId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const messages = await this.messageRepository.find({
            where: { sessionId },
            order: { createdAt: 'ASC' },
            relations: ['sender'],
          });

          const transcript = this.buildTranscript(messages);
          const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0;

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
          subscriber.complete();
        }
      })();
    });
  }

  @Public()
  @Sse('user/:id/reviews/summary/stream')
  streamUserReviewsSummary(@Param('id') userId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          const reviews = await this.reviewRepository.find({
            where: { revieweeId: userId },
            order: { createdAt: 'DESC' },
            take: 30,
          });

          if (reviews.length === 0) {
            subscriber.next({ data: 'No reviews yet — once partners leave reviews, an AI digest appears here.' } as MessageEvent);
            return;
          }

          const reviewsText = reviews
            .map((r) => {
              const stars = '★'.repeat(r.rating) + '☆'.repeat(Math.max(0, 5 - r.rating));
              const comment = r.comment?.trim() || '(no written comment)';
              return `[${stars}] ${comment}`;
            })
            .join('\n');

          const generator = this.aiService.streamUserReviewsSummary(reviewsText, reviews.length);
          for await (const chunk of generator) {
            subscriber.next({ data: chunk } as MessageEvent);
          }
        } catch (e) {
          subscriber.error(e);
        } finally {
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
}
