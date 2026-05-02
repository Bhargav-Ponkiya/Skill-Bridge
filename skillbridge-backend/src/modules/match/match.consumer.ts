import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class MatchConsumer {
  private readonly logger = new Logger(MatchConsumer.name);

  @RabbitSubscribe({
    exchange: 'skillbridge.exchange',
    routingKey: 'match.requested',
    queue: 'match-processing-queue',
  })
  public async handleMatchRequested(msg: any) {
    this.logger.log(`Received match.requested event for MatchRequest ID: ${msg.matchRequestId}`);
    // Future: enqueue email + push notifications for the recipient.
  }

  // NOTE: `match.accepted` is intentionally NOT consumed here. Session creation now happens
  // synchronously inside MatchService.respondToMatchRequest so that we don't depend on
  // RabbitMQ being healthy for the critical happy path. SessionConsumer remains the single
  // subscriber on `match.accepted` and is purely idempotent / for fan-out side effects.
}
