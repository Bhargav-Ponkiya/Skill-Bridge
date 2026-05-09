import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { NotificationService } from './notification.service';
import { NotificationType } from './notification.entity';

@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationService: NotificationService) {}

  @RabbitSubscribe({
    exchange: 'skillbridge.exchange',
    routingKey: 'notification.send',
    queue: 'notification-email-queue',
  })
  public async handleSendNotification(msg: any) {
    this.logger.log(
      `Received notification request for user ${msg.userId}: ${msg.title}`,
    );

    // Save the notification which acts as the in-app notification publisher
    await this.notificationService.create({
      userId: msg.userId,
      type: msg.type || NotificationType.MATCH_REQUEST,
      title: msg.title,
      message: msg.message,
      relatedId: msg.relatedId,
    });

    // Future expansion: Send the actual email notification through Sendgrid/Resend!
  }
}
