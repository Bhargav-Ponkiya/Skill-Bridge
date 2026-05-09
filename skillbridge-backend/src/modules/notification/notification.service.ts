import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { CreateNotificationInput } from './dto/create-notification.input';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @Inject('PUB_SUB') private readonly pubSub: PubSub,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepository.create(input);
    const saved = await this.notificationRepository.save(notification);

    // Publish via GraphQL subscriptions to frontends listening
    this.pubSub.publish(`notificationData_${saved.userId}`, {
      onNotification: saved,
    });

    return saved;
  }

  async findMyNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notif = await this.notificationRepository.findOne({
      where: { id, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    notif.isRead = true;
    return this.notificationRepository.save(notif);
  }
}
